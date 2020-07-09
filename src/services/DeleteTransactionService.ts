import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

class DeleteTransactionService {
    public async execute(id: string): Promise<void> {
        const transactionRepository = getRepository(Transaction);

        const transaction = await transactionRepository.findOne(id);

        if (!transaction) {
            throw new AppError('Transaction to delete does not exist');
        }

        await transactionRepository.remove(transaction);
    }
}

export default DeleteTransactionService;
