import { Client } from "@notionhq/client";
import { amazonServices } from '../services/amazon';
import { convertAsinToProductUrl, extractAsinFromUrl } from '../helpers/amazon';
import { notionServices } from '../services/notion';

export const registerApplication = {
	async register(inputs: Array<string>) {
		const asinList = inputs.map(url => extractAsinFromUrl(url)).filter(asin => !!asin);
		if (asinList.length == 0) {
			// not amazon urls
			return
		}

		const databaseId = process.env.DATABASE_ID
		if (!databaseId) {
			throw new Error("not set DATABASE_ID");
			
		}
		const notion = new Client({
			auth: process.env.NOTION_TOKEN,
		});

		const response = await notionServices.queryDatabase(notion, databaseId)
			.catch((err) => {
				console.error(err);
				process.exit(1);
			});
		const readingList = notionServices.convertBookList(response)
		console.log("======== registered books =========")
		console.log(readingList)
		const registeredAsinList = readingList.map(reading => reading.asin)
		console.log(registeredAsinList)
		const targetAsinList = asinList.filter(asin => !(registeredAsinList.includes(asin)))
		const amazonUrlList = convertAsinToProductUrl(targetAsinList)
		console.log(amazonUrlList)
		if (amazonUrlList.length == 0) {
			// inputs all registered
			return
		}

		const bookList = await amazonServices.scrapingAmazonProductData(amazonUrlList)
		console.log("======== staging books =========")
		console.log(bookList)
		const propertiesList = notionServices.convertCreateParameters(bookList)
		await notionServices.createPages(notion, databaseId, propertiesList)
			.catch((err) => {
				console.error(err);
				process.exit(1);
			});
	}
}
