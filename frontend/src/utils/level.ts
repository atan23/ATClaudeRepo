export function getLevelName(level: number): string {
  const names = [
    '', 'Curious Reader', 'Book Explorer', 'Avid Reader', 'Literature Lover',
    'Bookworm', 'Bibliophile', 'Book Sage', 'Literary Master', 'Grand Scholar', 'Legendary Reader',
  ];
  return names[level] || 'Legendary Reader';
}
