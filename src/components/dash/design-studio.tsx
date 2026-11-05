import { useEffect, useMemo, useRef, useState } from "react";
import { newId, type Memory } from "./memory";
import { downloadFile, downloadText } from "./format";

type Update = (recipe: (prev: Memory) => Memory) => void;
type Kind = "landing" | "prototype" | "deck" | "social";

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "landing", label: "Landing page", hint: "A full responsive page: hero, benefits, how it works, FAQ, call to action." },
  { id: "prototype", label: "Prototype", hint: "A clickable app mock with 3 to 5 screens in a phone frame." },
  { id: "deck", label: "Slide deck", hint: "16:9 slides. Export as PDF, PowerPoint or a video slideshow." },
  { id: "social", label: "Social graphic", hint: "One post or story graphic. Export as PNG or a short video." },
];
const SIZES = [
  { id: "square", label: "Square 1080" },
  { id: "portrait", label: "Portrait 4:5" },
  { id: "story", label: "Story 9:16" },
  { id: "wide", label: "Link 1200x628" },
];
const LABEL: Record<Kind, string> = { landing: "Landing", prototype: "Prototype", deck: "Deck", social: "Social" };
const PREFIX = "Design · ";
const MAX_SAVED = 300_000;

/**
 * Locks every generated page down: no network except Google Fonts, no forms posting anywhere,
 * and it runs in a sandboxed iframe without same-origin, so it cannot read the dashboard.
 */
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src data: blob:; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">`;

/** Runs inside the export frame: prints on request, or turns slides / the graphic into PNGs. */
const EXPORT_SCRIPT = `<script>
(function () {
  function styles() {
    var s = new XMLSerializer();
    return Array.prototype.map.call(document.querySelectorAll("style"), function (el) { return s.serializeToString(el); }).join("");
  }
  function shot(el) {
    var box = el.getBoundingClientRect();
    var w = Math.round(box.width) || 1080, h = Math.round(box.height) || 1080;
    var bg = getComputedStyle(document.body).backgroundColor;
    var xml = new XMLSerializer().serializeToString(el);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="margin:0;background:' + bg + '">' + styles() + xml + '</div></foreignObject></svg>';
    return new Promise(function (done, fail) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = w * 2; c.height = h * 2;
        var x = c.getContext("2d");
        x.scale(2, 2);
        x.drawImage(img, 0, 0, w, h);
        try { done({ url: c.toDataURL("image/png"), w: w, h: h }); } catch (e) { fail(e); }
      };
      img.onerror = function () { fail(new Error("render")); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  window.addEventListener("message", function (event) {
    var job = event.data || {};
    if (job.type === "print") { window.print(); return; }
    if (job.type !== "shots") return;
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      var list = Array.prototype.slice.call(document.querySelectorAll(".slide"));
      if (!list.length) { var art = document.getElementById("art"); list = [art || document.body.firstElementChild || document.body]; }
      return Promise.all(list.slice(0, 20).map(shot));
    }).then(function (images) {
      parent.postMessage({ type: "design-shots", id: job.id, images: images }, "*");
    }).catch(function (error) {
      parent.postMessage({ type: "design-shots", id: job.id, error: String(error && error.message || error) }, "*");
    });
  });
  parent.postMessage({ type: "design-ready" }, "*");
})();
</script>`;

function inject(html: string, extra = "") {
  const head = html.match(/<head[^>]*>/i);
  const withCsp = head ? html.replace(head[0], `${head[0]}${CSP}`) : `${CSP}${html}`;
  if (!extra) return withCsp;
  return /<\/body>/i.test(withCsp) ? withCsp.replace(/<\/body>/i, `${extra}</body>`) : `${withCsp}${extra}`;
}

function kindOf(title: string): Kind {
  const tag = title.slice(PREFIX.length).split(" · ")[0];
  return (Object.entries(LABEL).find(([, label]) => label === tag)?.[0] as Kind) || "landing";
}

function fileBase(title: string) {
  return (title.slice(PREFIX.length).split(" · ").slice(1).join(" ") || "design").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "design";
}

/** Plays the PNGs as a slideshow with a slow zoom and records it. MP4 where the browser can, WebM otherwise. */
async function recordVideo(images: { url: string; w: number; h: number }[], seconds: number) {
  const first = images[0];
  const canvas = document.createElement("canvas");
  canvas.width = first.w;
  canvas.height = first.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw video frames.");
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error("This browser cannot record video.");
  const pictures = await Promise.all(images.map((row) => new Promise<HTMLImageElement>((done, fail) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => fail(new Error("frame"));
    img.src = row.url;
  })));
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise<Blob>((done) => { recorder.onstop = () => done(new Blob(chunks, { type: mime.split(";")[0] })); });
  recorder.start();
  for (const img of pictures) {
    const start = performance.now();
    await new Promise<void>((done) => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / (seconds * 1000));
        const zoom = 1 + 0.06 * t;
        const w = canvas.width * zoom;
        const h = canvas.height * zoom;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        if (t < 1) requestAnimationFrame(frame); else done();
      };
      requestAnimationFrame(frame);
    });
  }
  recorder.stop();
  const blob = await finished;
  return { blob, ext: mime.startsWith("video/mp4") ? "mp4" : "webm" };
}

export function DesignStudio({ data, update }: { data: Memory; update: Update }) {
  const [kind, setKind] = useState<Kind>("landing");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("square");
  const [slides, setSlides] = useState(8);
  const [change, setChange] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const exportFrame = useRef<HTMLIFrameElement | null>(null);
  const [exportDoc, setExportDoc] = useState("");

  const designs = useMemo(() => data.media.filter((row) => row.title.startsWith(PREFIX)), [data.media]);
  const open = designs.find((row) => row.id === openId) || null;
  const keyOf = (label: string) => data.keys.find((row) => row.name === label)?.value || "";

  useEffect(() => {
    if (!openId && designs[0]) setOpenId(designs[0].id);
  }, [designs, openId]);

  async function generate(revise: boolean) {
    if (busy) return;
    if (!revise && !brief.trim()) { setNote("Write a brief first."); return; }
    if (revise && (!open || !change.trim())) { setNote("Open a design and say what should change."); return; }
    setBusy(revise ? "revise" : "make");
    setNote(revise ? "Revising the design…" : "Designing… this takes 20 to 60 seconds.");
    try {
      const { draftDesign } = await import("@/lib/lifeos/design");
      const result = await draftDesign({
        data: {
          kind: revise && open ? kindOf(open.title) : kind,
          brief: revise ? "" : brief,
          brand,
          size,
          slides,
          html: revise && open ? open.body : "",
          change: revise ? change : "",
          keys: {
            anthropic: keyOf("Anthropic"),
            openai: keyOf("OpenAI"),
            openrouter: keyOf("OpenRouter"),
            nvidia: keyOf("NVIDIA") || keyOf("NVIDIA NIM"),
            groq: keyOf("Groq"),
            gemini: keyOf("Google AI (Gemini)"),
            deepseek: keyOf("DeepSeek"),
            xai: keyOf("xAI"),
            ollama: keyOf("Ollama Cloud"),
          },
        },
      });
      if (!result.ok) { setNote(result.error); return; }
      if (result.html.length > MAX_SAVED) { setNote("The design came back too large to save. Try a shorter brief."); return; }
      const label = revise && open ? open.title : `${PREFIX}${LABEL[kind]} · ${(name.trim() || brief.trim().slice(0, 40) || "Untitled").replace(/·/g, "-")}`;
      const id = revise && open ? open.id : newId();
      update((prev) => ({
        ...prev,
        media: revise && open
          ? prev.media.map((row) => row.id === open.id ? { ...row, body: result.html, at: new Date().toISOString() } : row)
          : [{ id, title: label.slice(0, 120), body: result.html, at: new Date().toISOString() }, ...prev.media],
      }));
      setOpenId(id);
      setChange("");
      setNote(`${revise ? "Revised" : "Made"} with ${result.model}. Saved in Creator.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The design did not finish.");
    } finally {
      setBusy("");
    }
  }

  /** Loads the design into the hidden export frame and runs one job there. */
  function inFrame<T>(job: "print" | "shots") {
    return new Promise<T>((resolve, reject) => {
      if (!open) { reject(new Error("Open a design first.")); return; }
      const id = newId();
      const timer = window.setTimeout(() => { window.removeEventListener("message", onMessage); reject(new Error("The export timed out.")); }, 30_000);
      function onMessage(event: MessageEvent) {
        if (event.source !== exportFrame.current?.contentWindow) return;
        const msg = event.data as { type?: string; id?: string; images?: unknown; error?: string };
        if (msg.type === "design-ready") {
          exportFrame.current?.contentWindow?.postMessage(job === "print" ? { type: "print" } : { type: "shots", id }, "*");
          if (job === "print") { window.clearTimeout(timer); window.removeEventListener("message", onMessage); resolve(undefined as T); }
          return;
        }
        if (msg.type === "design-shots" && msg.id === id) {
          window.clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          if (msg.error) reject(new Error("This design could not be turned into an image. Try PDF instead."));
          else resolve(msg.images as T);
        }
      }
      window.addEventListener("message", onMessage);
      setExportDoc(`${inject(open.body, EXPORT_SCRIPT)}<!-- ${id} -->`);
    });
  }

  async function exportAs(format: "html" | "pdf" | "png" | "pptx" | "video") {
    if (!open || busy) return;
    const base = fileBase(open.title);
    setBusy(format);
    try {
      if (format === "html") { downloadText(`${base}.html`, open.body, "text/html"); setNote("HTML downloaded."); return; }
      if (format === "pdf") { setNote("Opening print. Choose Save as PDF."); await inFrame("print"); return; }
      setNote("Rendering…");
      const images = await inFrame<{ url: string; w: number; h: number }[]>("shots");
      if (!images.length) throw new Error("Nothing to export.");
      if (format === "png") {
        images.forEach((row, index) => downloadFile(images.length > 1 ? `${base}-${index + 1}.png` : `${base}.png`, row.url));
        setNote(`${images.length} PNG${images.length > 1 ? "s" : ""} downloaded.`);
        return;
      }
      if (format === "pptx") {
        const { default: PptxGenJS } = await import("pptxgenjs");
        const deck = new PptxGenJS();
        deck.layout = "LAYOUT_WIDE";
        for (const row of images) deck.addSlide().addImage({ data: row.url, x: 0, y: 0, w: 13.333, h: 7.5 });
        await deck.writeFile({ fileName: `${base}.pptx` });
        setNote("PowerPoint downloaded. Each slide is a full-quality picture of the design.");
        return;
      }
      setNote("Recording the video…");
      const { blob, ext } = await recordVideo(images, kindOf(open.title) === "social" ? 6 : 3);
      const url = URL.createObjectURL(blob);
      downloadFile(`${base}.${ext}`, url);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNote(`Video downloaded as ${ext.toUpperCase()}.`);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The export failed.");
    } finally {
      setBusy("");
    }
  }

  const openKind = open ? kindOf(open.title) : kind;
  const previewHeight = openKind === "social" ? "min(70vh, 720px)" : "70vh";

  return (
    <section className="module-card p-4" aria-label="Design studio">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg">Design studio</h2>
          <p className="text-sm text-white/50">Describe it, get a finished design, then revise it in plain words. Every design is saved here and can be exported.</p>
        </div>
        <div className="flex flex-wrap gap-3" role="group" aria-label="What to design">
          {KINDS.map((item) => (
            <button key={item.id} type="button" className={`quiet ${kind === item.id ? "is-on" : ""}`} aria-pressed={kind === item.id} onClick={() => setKind(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-2">
          <p className="text-xs text-white/50">{KINDS.find((item) => item.id === kind)?.hint}</p>
          <label className="block text-[11px] text-white/45">Name
            <input className="mt-1 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-[11px] text-white/45">Brief
            <textarea className="mt-1 min-h-32 w-full rounded-2xl border border-line bg-black/40 px-3 py-2 text-sm" value={brief} placeholder="Who it is for, what it should say, the one action people should take." onChange={(event) => setBrief(event.target.value)} />
          </label>
          <label className="block text-[11px] text-white/45">Brand notes (optional)
            <input className="mt-1 h-8 w-full rounded-full border border-line bg-black/40 px-3 text-sm" value={brand} placeholder="Colors, fonts, tone. Example: navy and gold, bold, confident" onChange={(event) => setBrand(event.target.value)} />
          </label>
          {kind === "social" ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Graphic size">
              {SIZES.map((item) => <button key={item.id} type="button" className={`quiet ${size === item.id ? "is-on" : ""}`} aria-pressed={size === item.id} onClick={() => setSize(item.id)}>{item.label}</button>)}
            </div>
          ) : null}
          {kind === "deck" ? (
            <label className="flex items-center gap-2 text-[11px] text-white/45">Slides
              <input type="number" min={3} max={16} value={slides} onChange={(event) => setSlides(Math.min(16, Math.max(3, Number(event.target.value) || 8)))} className="h-8 w-20 rounded-full border border-line bg-black/40 px-3 text-sm text-white" />
            </label>
          ) : null}
          <button type="button" className={`quiet is-on ${busy === "make" ? "is-busy" : ""}`} aria-busy={busy === "make"} disabled={Boolean(busy)} onClick={() => void generate(false)}>
            {busy === "make" ? "Designing" : "Create design"}
          </button>
          {note ? <p className="text-sm text-white/70" aria-live="polite">{note}</p> : null}

          {designs.length ? (
            <div className="mt-2">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-white/40">Saved designs · {designs.length}</p>
              <ul className="grid gap-1">
                {designs.map((row) => (
                  <li key={row.id}>
                    <button type="button" className={`menu w-full text-left ${openId === row.id ? "is-on" : ""}`} onClick={() => setOpenId(row.id)}>
                      <span className="block truncate text-sm">{row.title.slice(PREFIX.length)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          {open ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-base">{open.title.slice(PREFIX.length)}</p>
                <button type="button" className="quiet" disabled={Boolean(busy)} onClick={() => void exportAs("html")}>HTML</button>
                <button type="button" className="quiet" disabled={Boolean(busy)} onClick={() => void exportAs("pdf")}>PDF</button>
                {openKind === "deck" || openKind === "social" ? <button type="button" className="quiet" disabled={Boolean(busy)} onClick={() => void exportAs("png")}>PNG</button> : null}
                {openKind === "deck" ? <button type="button" className="quiet" disabled={Boolean(busy)} onClick={() => void exportAs("pptx")}>PowerPoint</button> : null}
                {openKind === "deck" || openKind === "social" ? <button type="button" className="quiet" disabled={Boolean(busy)} onClick={() => void exportAs("video")}>Video</button> : null}
                <button type="button" className="link-remove" onClick={() => { update((prev) => ({ ...prev, media: prev.media.filter((row) => row.id !== open.id) })); setOpenId(null); }}>Remove</button>
              </div>
              <iframe
                title={`Preview of ${open.title.slice(PREFIX.length)}`}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                srcDoc={inject(open.body)}
                className="w-full rounded-xl border border-white/10 bg-white"
                style={{ height: previewHeight }}
              />
              <div className="flex flex-wrap gap-2">
                <input className="h-8 min-w-48 flex-1 rounded-full border border-line bg-black/40 px-3 text-sm" value={change} placeholder="What should change? Example: darker hero, shorter headline, add pricing" onChange={(event) => setChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void generate(true); }} />
                <button type="button" className={`quiet is-on ${busy === "revise" ? "is-busy" : ""}`} aria-busy={busy === "revise"} disabled={Boolean(busy)} onClick={() => void generate(true)}>{busy === "revise" ? "Revising" : "Revise"}</button>
              </div>
            </>
          ) : (
            <p className="grid min-h-48 place-items-center rounded-xl border border-dashed border-white/15 text-sm text-white/40">Your design appears here.</p>
          )}
        </div>
      </div>

      {exportDoc ? (
        <iframe
          ref={exportFrame}
          title="Design export"
          aria-hidden="true"
          tabIndex={-1}
          sandbox="allow-scripts allow-modals"
          srcDoc={exportDoc}
          style={{ position: "fixed", left: -20000, top: 0, width: openKind === "deck" ? 1280 : openKind === "social" ? 1920 : 1280, height: 2000, border: 0 }}
        />
      ) : null}
    </section>
  );
}
