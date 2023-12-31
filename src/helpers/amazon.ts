export function convertAsinToProductUrl(asinList: Array<string>): Array<string> {
  const amazonUrlBase = "https://www.amazon.co.jp/dp/"
  return asinList.map(asin => `${amazonUrlBase}${asin}`)
}

export function extractAsinFromUrl(url: string): string {
  const asinUrlPattern = /\/(dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/;
  const match = url.match(asinUrlPattern);
  
  if (match && match.length >= 3) {
    return match[2];
  }
  
  return "";
}

export function isValidUrl(url: string): boolean {
  const urlPattern = /^https:\/\/[^\s/$.?#].[^\s]*$/i;
  return urlPattern.test(url);
}
