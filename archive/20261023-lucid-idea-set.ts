/** Archived 2026-10-23. Lucid Find used these local templates. The desk now lists public posts from findIdeas. */

type Step = { id: string; label: string; owner: "lucid" | "you"; done: boolean; output: string };
type Idea = { id: string; name: string; summary: string; effort: string; range: string; tools: string[]; account: string; risks: string; steps: Step[] };

export function ideaSet(niche: string, hours: string, face: boolean): Idea[] {
  const topic = niche.trim() || "a subject you can explain without research";
  const all: Idea[] = [
    { id: "pack", name: `A $12 download about ${topic}`, summary: "One short checklist. Lucid writes it and the shop page. You create the shop and upload the file.", effort: "Low. One sitting after the copy is written.", range: "Usually slow. A few sales, not a salary.", tools: ["content", "listings"], account: "New Gumroad or PayPal shop", risks: "No shop approval, no sales. Crowded topics sit at zero.", steps: [
      { id: "write", label: "Write the file and the sales page", owner: "lucid", done: false, output: `Title: ${topic} — the short checklist\nPrice to test: $12\nBuyer gets a 1–2 page file they can use the same day.\nNo income claim on the page.` },
      { id: "shop", label: "Open the shop and upload the file", owner: "you", done: false, output: "" },
    ] },
    { id: "clips", name: `Ten answer clips about ${topic}`, summary: "Short scripts for a new channel. No face required. You post them on the channel you create.", effort: "Low if you record voice only, or use text on screen.", range: "Most new channels earn nothing for months.", tools: ["content", "social"], account: "New YouTube channel", risks: "Reused footage and copied scripts get limited. One topic only.", steps: [
      { id: "scripts", label: "Write 10 short scripts", owner: "lucid", done: false, output: Array.from({ length: 10 }, (_, index) => `${index + 1}. One question about ${topic}. Answer in under 40 seconds.`).join("\n") },
      { id: "channel", label: "Create the channel and post the first three", owner: "you", done: false, output: "" },
    ] },
    { id: "compare", name: `One comparison page for ${topic}`, summary: "A page that compares two or three options you have actually used. You publish it where you can add a link later.", effort: "Low. One page, not a blog.", range: "Pays only if a program has already approved you and someone buys.", tools: ["content"], account: "New page on a site you control", risks: "Do not review products you have not used. No link, no payout.", steps: [
      { id: "draft", label: "Draft the comparison", owner: "lucid", done: false, output: `Page: ${topic}, two or three options\nFor each: what it is for, what it is bad at, what it costs.\nLeave the link blank until the program approves the account.` },
      { id: "publish", label: "Publish the page", owner: "you", done: false, output: "" },
    ] },
    { id: "etsy", name: `A template pack for ${topic}`, summary: "Three simple templates. Lucid writes the titles and tags. You export them and list them.", effort: "Low if the templates are plain documents.", range: "Often a few dollars a sale, if they sell.", tools: ["content", "assets", "listings"], account: "New Etsy or Creative Market shop", risks: "Do not list files you do not own. New shops can take days to clear.", steps: [
      { id: "copy", label: "Write three listings", owner: "lucid", done: false, output: `1. ${topic} checklist\n2. ${topic} tracker\n3. ${topic} first-week plan\nSay the format and that the buyer edits it.` },
      { id: "list", label: "Open the shop and publish the three files", owner: "you", done: false, output: "" },
    ] },
    { id: "replies", name: `Answer people already asking about ${topic}`, summary: "Lucid writes the searches and a short reply. You post it only where someone asked.", effort: "Low. A few replies, not a content calendar.", range: "One paid job if the reply is specific. Most threads pay nothing.", tools: ["leads", "social"], account: "The profile you post from", risks: "Copied ads get removed. Reply only to a real request.", steps: [
      { id: "pack", label: "Write the searches and the reply", owner: "lucid", done: false, output: `Search: "looking for" ${topic}\nSearch: "anyone know" ${topic}\n\nReply: I can help with ${topic}. Tell me the deadline and what done looks like. I will answer with a price before any work.` },
      { id: "post", label: "Send that reply on a thread that asked", owner: "you", done: false, output: "" },
    ] },
  ];
  return all.filter((idea) => {
    if (!face && idea.id === "clips") return hours !== "1";
    if (hours === "1") return idea.id === "pack" || idea.id === "replies" || idea.id === "compare";
    return true;
  });
}
