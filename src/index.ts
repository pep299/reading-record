import fs from 'fs';
import dotenv from "dotenv";
import { registerApplication } from './applications/register';

dotenv.config();

function main() {
  const inputFile = 'data/urls.txt';
  const inputs = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(url => url.trim() !== '');
  registerApplication.register(inputs)
}

main();
