import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';

interface Request {
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

interface Response {
    id: string;
    title: string;
    value: number;
    type: 'income' | 'outcome';
    category: string;
}

class CreateTransactionService {
    public async execute({
        title,
        value,
        type,
        category,
    }: Request): Promise<Response> {
        const transactionRepository = getCustomRepository(
            TransactionRepository,
        );

        const balance = await transactionRepository.getBalance();

        if (type === 'outcome' && balance.total < value) {
            throw new AppError(
                'Operation outcome is greater than current balance value',
            );
        }

        const categoryRepository = getRepository(Category);

        let transactionCategory = await categoryRepository.findOne({
            where: { title: category },
        });

        if (!transactionCategory) {
            transactionCategory = categoryRepository.create({
                title: category,
            });

            await categoryRepository.save(transactionCategory);
        }

        const transaction = transactionRepository.create({
            title,
            value,
            type,
            category_id: transactionCategory.id,
        });

        await transactionRepository.save(transaction);

        const { id } = transaction;

        return {
            id,
            title,
            value,
            type,
            category: transactionCategory.title,
        };
    }
}

export default CreateTransactionService;
