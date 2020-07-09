import { getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
    transactionsDirectory: string;
    transactionsFilename: string;
}

interface CSVInput {
    title: string;
    type: 'income' | 'outcome';
    value: number;
    category: string;
}

class ImportTransactionsService {
    async execute({
        transactionsDirectory,
        transactionsFilename,
    }: Request): Promise<Transaction[]> {
        const categoriesRepository = getRepository(Category);
        const transactionsRepository = getRepository(Transaction);

        const readCSVStream = fs.createReadStream(
            path.resolve(transactionsDirectory, transactionsFilename),
        );

        const parseStream = csvParse({
            from_line: 2,
        });

        const parseCSV = readCSVStream.pipe(parseStream);

        const transactions: CSVInput[] = [];
        const categories: string[] = [];

        parseCSV.on('data', async line => {
            const [title, type, value, category] = line.map((cell: string) =>
                cell.trim(),
            );

            categories.push(category);

            transactions.push({
                title,
                type,
                value,
                category,
            });
        });

        await new Promise(resolve => {
            parseCSV.on('end', resolve);
        });

        const existentCategories = await categoriesRepository.find({
            where: {
                title: In(categories),
            },
        });

        const existentCategoriesTitles = existentCategories.map(
            (category: Category) => category.title,
        );

        const missingCategoriesTitles = categories
            .filter(category => !existentCategoriesTitles.includes(category))
            .filter((value, index, self) => self.indexOf(value) === index);

        const newCategories = categoriesRepository.create(
            missingCategoriesTitles.map((title: string) => ({ title })),
        );

        await categoriesRepository.save(newCategories);

        const finalCategories = [...newCategories, ...existentCategories];

        const createdTransactions = transactionsRepository.create(
            transactions.map(transaction => ({
                title: transaction.title,
                type: transaction.type,
                value: transaction.value,
                category: finalCategories.find(
                    category => category.title === transaction.category,
                ),
            })),
        );

        await transactionsRepository.save(createdTransactions);

        await fs.promises.unlink(
            path.resolve(transactionsDirectory, transactionsFilename),
        );

        return createdTransactions;
    }
}

export default ImportTransactionsService;
