/** Chooses one planner tool, then turns the tool result into a next step. */

export function plannerLineFor(text: string) {
  const q = text.toLowerCase();
  const url = text.match(/https?:\/\/\S+/i)?.[0] || "";
  if (url && /\b(open|browse|page|site)\b/i.test(text) && !/\bapproved=yes\b/i.test(text)) return "";
  if (/\b(tasks?|todo|do first)\b/.test(q)) return "READ_LIFEOS: tasks";
  if (/\b(leads?|contacts?|crm)\b/.test(q)) return "READ_LIFEOS: crm";
  if (/\b(bills?|unpaid|pay|money|balance|expenses?)\b/.test(q)) return "READ_LIFEOS: bills";
  if (/\bnotes?\b/.test(q)) return "READ_LIFEOS: notes";
  if (/\b(calendar|meeting|schedule)\b/.test(q)) return "READ_LIFEOS: calendar";
  if (/\bgoals?\b/.test(q)) return "READ_LIFEOS: goals";
  if (url && /\bapproved=yes\b/i.test(text)) return `BROWSE_URL: ${url}`;
  if (/\b(search|look up)\b/.test(q)) {
    const query = text.replace(/\b(search|look up)\b/gi, "").trim().slice(0, 180) || text.slice(0, 180);
    return `SEARCH_WEB: ${query}`;
  }
  return "";
}

function linesOf(result: string) {
  return result.split("\n").map((row) => row.trim()).filter(Boolean);
}

export function decideReply(line: string, result: string) {
  if (line === "READ_LIFEOS: tasks") {
    const open = linesOf(result).flatMap((row) => {
      const match = row.match(/^open \| (.+)$/);
      return match ? [match[1]] : [];
    });
    if (!open.length) return "No open tasks. There is nothing to start.";
    const rest = open.length - 1;
    const waiting = rest ? `${rest} other open task${rest === 1 ? "" : "s"} can wait.` : "It is the only open task.";
    return `Start with ${open[0]}. ${waiting} Dinner at 6:30 stays put.`;
  }
  if (line === "READ_LIFEOS: crm") {
    if (result.startsWith("No leads")) return "No leads saved, so there is no next step today.";
    const rows = linesOf(result).filter((row) => row.includes("|"));
    const cold = rows.filter((row) => /cold|lost|inactive|stale/i.test(row));
    const pick = (cold[0] || rows[0] || "").split("|").map((part) => part.trim());
    const name = pick[0] || "";
    if (!name) return "No leads saved, so there is no next step today.";
    const status = pick[1] || "no status";
    const note = pick[2] || "";
    const why = cold.length ? `${name} is ${status}, so that one comes before the warmer names.` : `${name} is the first lead on the board (${status}).`;
    const step = note ? `Next step: ${note}` : "Next step: write one note and set a status before calling anyone else.";
    return `${why} ${step}`;
  }
  if (line === "READ_LIFEOS: bills") {
    const due = linesOf(result).flatMap((row) => {
      const match = row.match(/^due \| ([0-9.]+) \| (.+)$/);
      return match ? [{ amount: Number(match[1]), name: match[2] }] : [];
    }).sort((a, b) => b.amount - a.amount);
    if (!due.length) return result.startsWith("No bills") ? "No bills saved." : "No unpaid bills. Nothing to pay first.";
    const rest = due.length - 1;
    const waiting = rest ? `${rest} other unpaid bill${rest === 1 ? "" : "s"} can wait.` : "It is the only unpaid bill.";
    return `Pay ${due[0].name} first. It is due and the largest unpaid amount (${due[0].amount}). ${waiting}`;
  }
  if (line === "READ_LIFEOS: notes") {
    if (result.startsWith("No notes")) return "No notes saved, so there is nothing to apply.";
    const parts = result.split("|").map((part) => part.trim());
    const title = parts[1] || "Untitled";
    const body = parts.slice(2).join(" | ");
    return body ? `Use the latest note, ${title}, before writing another. It starts: ${body}` : `Use the latest note, ${title}, before writing another.`;
  }
  if (line === "READ_LIFEOS: calendar") {
    if (result.startsWith("No calendar")) return "No calendar events saved. Dinner at 6:30 still stands.";
    return `The next saved event is ${linesOf(result)[0]}. Keep dinner at 6:30 if it conflicts.`;
  }
  if (line === "READ_LIFEOS: goals") {
    if (result.startsWith("No goals")) return "No goals saved.";
    return `The first goal is ${linesOf(result)[0]}. Work that one before opening a new goal.`;
  }
  if (line.startsWith("SEARCH_WEB:")) return result.startsWith("No search") ? result : `Search returned this. Use it before guessing:\n${result}`;
  if (line.startsWith("BROWSE_URL:")) return result;
  return result;
}
