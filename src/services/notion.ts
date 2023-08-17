import { Client } from "@notionhq/client";
import PageObjectResponse, { CreatePageParameters, DatePropertyItemObjectResponse, FilesPropertyItemObjectResponse, MultiSelectPropertyItemObjectResponse, RichTextItemResponse, SelectPropertyItemObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Book } from "../models/book";

export const notionServices = {
  async queryDatabase(notion: Client, databaseId: string): Promise<Array<PageObjectResponse>> {
    const response = await notion.databases.query({
      database_id: databaseId,
    });
  
    const pages: Array<PageObjectResponse> = [];
    for (const page of response.results) {
      if (!("url" in page)) {
        // Skip partial page objects (these shouldn't be returned anyway.)
        continue
      }
      if (page.object == "page") {
        pages.push(page)
      }
    }

    return pages
  },

  convertBookList(response: Array<PageObjectResponse>): Array<Book> {
    return response.map(pageObj => {
      const title = pageObj.properties["title"]?.type == "title" ? notionProperties.plainText(pageObj.properties["title"].title) : null
      const authors = pageObj.properties["authors"]?.type == "rich_text" ? notionProperties.plainText(pageObj.properties["authors"].rich_text) : null
      const publisher = pageObj.properties["publisher"]?.type == "rich_text" ? notionProperties.plainText(pageObj.properties["publisher"].rich_text) : null
      const publicationDate = pageObj.properties["publication_date"]?.type == "date" ? notionProperties.date(pageObj.properties["publication_date"].date) : null
      const isbn = pageObj.properties["isbn"]?.type == "rich_text" ? notionProperties.plainText(pageObj.properties["isbn"].rich_text) : null
      const asin = pageObj.properties["asin"]?.type == "rich_text" ? notionProperties.plainText(pageObj.properties["asin"].rich_text) : null
      const amazonUrl = pageObj.properties["amazon_url"]?.type == "url" ? notionProperties.url(pageObj.properties["amazon_url"].url) : null
      const thumbnail = pageObj.properties["thumbnail"]?.type == "files" ? notionProperties.files(pageObj.properties["thumbnail"].files) : null
      const tags = pageObj.properties["tags"]?.type == "multi_select" ? notionProperties.multiSelect(pageObj.properties["tags"].multi_select) : null
      const memo = pageObj.properties["memo"]?.type == "rich_text" ? notionProperties.plainText(pageObj.properties["memo"].rich_text) : null
      const closedAt = pageObj.properties["closed_at"]?.type == "date" ? notionProperties.date(pageObj.properties["closed_at"].date) : null
      const createdAt = pageObj.properties["created_at"]?.type == "created_time" ? notionProperties.dateTime(pageObj.properties["created_at"].created_time) : null
      const updatedAt = pageObj.properties["updated_at"]?.type == "last_edited_time" ? notionProperties.dateTime(pageObj.properties["updated_at"].last_edited_time) : null
      
      return {
        title,
        authors,
        publisher,
        publicationDate,
        isbn,
        asin,
        amazonUrl,
        thumbnail,
        tags,
        memo,
        closedAt,
        createdAt,
        updatedAt
      }
    })
  },

  convertCreateParameters(bookList: Array<Book>): Array<Record<string, CreatePageParameters["properties"]>> {
    return bookList.map(book => {
      const propertyValues: Record<string, CreatePageParameters["properties"]> = {}
      propertyValues["title"] = notionField.makeTitleField(book.title ?? "")
      propertyValues["authors"] = notionField.makeRichTextField(book.authors ?? "")
      propertyValues["publisher"] = notionField.makeRichTextField(book.publisher ?? "")
      propertyValues["publication_date"] = notionField.makeDateField(book.publicationDate ?? "")
      propertyValues["asin"] = notionField.makeRichTextField(book.asin ?? "")
      propertyValues["isbn"] = notionField.makeRichTextField(book.isbn ?? "")
      propertyValues["amazon_url"] = notionField.makeUrlField(book.amazonUrl ?? "")
      propertyValues["status"] = notionField.makeStatusField()
      propertyValues["thumbnail"] = notionField.makeFilesField(book.thumbnail ?? "")
      return propertyValues
    })
  },

  async createPages(
    notion: Client,
    databaseId: string,
    propertiesList: Array<Record<string, CreatePageParameters["properties"]>>
  ) {
    for (const properties of propertiesList) {
      const parameters: CreatePageParameters = {
        parent: {
          database_id: databaseId,
        },
        properties: properties,
      } as CreatePageParameters
    
      const response = await notion.pages.create(parameters)
    }
  }
}

const notionField = {
  makeRichTextField(value: string): CreatePageParameters["properties"] {
    return {
      type: "rich_text",
      rich_text: [
        {
          type: "text",
          text: { content: value },
        },
      ],
    }
  },
  makeTitleField(value: string): CreatePageParameters["properties"] {
    return {
      type: "title",
      title: [
        {
          type: "text",
          text: { content: value },
        },
      ],
    }
  },
  makeDateField(value: string): CreatePageParameters["properties"] {
    return {
      type: "date",
      date: {
        start: value
      },
    }
  },
  makeUrlField(value: string): CreatePageParameters["properties"] {
    return {
      type: "url",
      url: value,
    }
  },
  makeFilesField(value: string): CreatePageParameters["properties"] {
    return {
      type: "files",
      files: [{
        external: {
          url: value
        },
        name: value,
        type: "external"
      }]
    }
  },
  makeStatusField(): CreatePageParameters["properties"] {
    return {
      type: "status",
      status: {
        name: "Interested" // default value,
      },
    }
  },
}

const notionProperties = {
  date(value: DatePropertyItemObjectResponse["date"] | null): string {
    return value ? new Date(value.start).toISOString() : ""
  },
  dateTime(value: string): string {
    return new Date(value).toISOString()
  },
  url(value: string | null): string {
    return value ?? ""
  },
  multiSelect(value: MultiSelectPropertyItemObjectResponse["multi_select"]): string {
    if (!value) {
      return ""
    }
    return value
      .map(select => `${select.id} ${select.name}`)
      .join(", ")
  },
  plainText(value: Array<RichTextItemResponse>): string {
    return value.map(text => text.plain_text).join("")
  },
  files(value: FilesPropertyItemObjectResponse["files"]): string {
    return value.map(file => file.name).join(", ")
  },
  status(value: SelectPropertyItemObjectResponse): string {
    return value.select?.name ?? ""
  },
}
