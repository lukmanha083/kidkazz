import type { IBudgetRepository } from '@/domain/repositories/budget.repository';
import { Budget, type BudgetLineInput } from '@/domain/entities/budget.entity';

/**
 * Create budget command
 */
export interface CreateBudgetCommand {
  name: string;
  fiscalYear: number;
  createdBy: string;
  lines?: BudgetLineInput[];
}

/**
 * Create budget result
 */
export interface CreateBudgetResult {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
}

/**
 * Handler for creating a budget
 */
export class CreateBudgetHandler {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(command: CreateBudgetCommand): Promise<CreateBudgetResult> {
    // Check if budget with same name exists for the year
    const existing = await this.budgetRepository.findByYearAndName(
      command.fiscalYear,
      command.name
    );

    if (existing) {
      throw new Error(`Budget "${command.name}" already exists for ${command.fiscalYear}`);
    }

    const budget = Budget.create({
      name: command.name,
      fiscalYear: command.fiscalYear,
      createdBy: command.createdBy,
      lines: command.lines,
    });

    await this.budgetRepository.save(budget);

    return {
      id: budget.id,
      name: budget.name,
      fiscalYear: budget.fiscalYear,
      status: budget.status,
    };
  }
}

/**
 * Update budget lines command
 */
export interface UpdateBudgetLinesCommand {
  budgetId: string;
  lines: BudgetLineInput[];
  userId: string;
}

/**
 * Handler for updating budget lines
 */
export class UpdateBudgetLinesHandler {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(command: UpdateBudgetLinesCommand): Promise<void> {
    const budget = await this.budgetRepository.findById(command.budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    for (const line of command.lines) {
      const revision = budget.setLine(line, command.userId);
      if (revision) {
        await this.budgetRepository.saveRevision(revision);
      }
    }

    await this.budgetRepository.save(budget);
  }
}

/**
 * Approve budget command
 */
export interface ApproveBudgetCommand {
  budgetId: string;
  userId: string;
}

/**
 * Handler for approving a budget
 */
export class ApproveBudgetHandler {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(command: ApproveBudgetCommand): Promise<void> {
    const budget = await this.budgetRepository.findById(command.budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    budget.approve(command.userId);
    await this.budgetRepository.save(budget);
  }
}

/**
 * Delete budget command
 */
export interface DeleteBudgetCommand {
  budgetId: string;
}

/**
 * Handler for deleting a budget
 */
export class DeleteBudgetHandler {
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async execute(command: DeleteBudgetCommand): Promise<void> {
    const budget = await this.budgetRepository.findById(command.budgetId);

    if (!budget) {
      throw new Error('Budget not found');
    }

    if (budget.status !== 'draft') {
      throw new Error('Only draft budgets can be deleted');
    }

    await this.budgetRepository.delete(command.budgetId);
  }
}
