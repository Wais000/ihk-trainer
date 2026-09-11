/** Fills `{placeholders}` in a dictionary string, e.g.
 * formatTemplate(dict.practice.questionProgress, { current: 1, total: 20 }). */
export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}
