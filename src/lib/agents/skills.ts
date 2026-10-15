export type Skill = { id: string; name: string; text: string };

const MAX_SKILL_CHARS = 800;
const MAX_BLOCK_CHARS = 4000;

export function skillBlock(skills: Skill[]) {
  if (!skills.length) return "";
  const lines = ["## Skills (procedures you've learned)"];
  let total = lines[0].length;
  for (const skill of skills) {
    const entry = `\n### ${skill.name}\n${skill.text.slice(0, MAX_SKILL_CHARS)}`;
    if (total + entry.length > MAX_BLOCK_CHARS) break;
    lines.push(entry);
    total += entry.length;
  }
  return lines.join("\n");
}

export function createSkill(name: string, text: string): Skill {
  return {
    id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 80),
    text: text.slice(0, MAX_SKILL_CHARS),
  };
}
