export function countWords(text: string) {
  return text.match(/\S+/g)?.length ?? 0
}

export function firstWords(text: string, count: number) {
  return text.match(new RegExp(`^(?:\\s*\\S+){${count}}`))?.[0] ?? ""
}
