import PageObjectResponse, { TextRichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

export function getRegisteredAsinList(readingList: Array<PageObjectResponse>): Array<string> {
  return readingList.map(reading => {
    const asin = reading.properties.asin as { rich_text: Array<TextRichTextItemResponse>; }
    return asin.rich_text.map(text => text.plain_text).join("")
  })
}
