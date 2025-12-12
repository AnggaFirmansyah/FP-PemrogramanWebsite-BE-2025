import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import {
  ErrorResponse,
  type IMathGeneratorJson,
  type IMathQuestion,
  prisma,
} from '@/common';
import { FileManager } from '@/utils';

import {
  type ICheckMathAnswer,
  type ICreateMathGenerator,
  type IUpdateMathGenerator,
} from './schema';

export abstract class MathGeneratorService {
  private static readonly slug = 'math-generator';

  static async createGame(data: ICreateMathGenerator, user_id: string) {
    const exist = await prisma.games.findUnique({ where: { name: data.name } });

    if (exist) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name already exists',
      );
    }

    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.slug },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Template not found. Run seed!',
      );
    }

    const generatedQuestions = this.generateQuestions(
      data.operation,
      data.difficulty,
      data.question_count,
    );

    const newGameId = v4();

    let thumbnailPath = '';

    if (data.thumbnail_image) {
      thumbnailPath = await FileManager.upload(
        `game/math/${newGameId}`,
        data.thumbnail_image,
      );
    }

    const gameJson: IMathGeneratorJson = {
      settings: {
        operation: data.operation,
        difficulty: data.difficulty,
        game_type: data.game_type,
        theme: data.theme,
        question_count: data.question_count,
      },
      score_per_question: data.score_per_question,
      questions: generatedQuestions,
    };

    return await prisma.games.create({
      data: {
        id: newGameId,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailPath,
        is_published: data.is_publish_immediately,
        creator_id: user_id,
        game_template_id: template.id,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        game_template: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  static async getGamePlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    role?: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    if (is_public && !game.is_published)
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Game is not published');

    if (!is_public && role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Access denied');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = game.game_json as IMathGeneratorJson;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const cleanQuestions = json.questions.map((q, index) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      index,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      question: q.question,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      options: q.options,
    }));

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      settings: json.settings,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      score_per_question: json.score_per_question,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      questions: cleanQuestions,
    };
  }

  static async checkAnswer(game_id: string, data: ICheckMathAnswer) {
    const game = await prisma.games.findUnique({ where: { id: game_id } });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = game.game_json as IMathGeneratorJson;
    let correctCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const results = data.answers.map(ans => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const actualQuestion = json.questions[ans.question_index];

      if (!actualQuestion)
        return { question_index: ans.question_index, is_correct: false };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const isCorrect = Number(ans.selected_answer) === actualQuestion.answer;

      if (isCorrect) correctCount++;

      return {
        question_index: ans.question_index,
        is_correct: isCorrect,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        correct_answer: actualQuestion.answer,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const maxScore = json.questions.length * json.score_per_question;
    const score =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      json.questions.length > 0
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (correctCount / json.questions.length) * 100
        : 0;

    return {
      score,
      correct_count: correctCount,
      max_score: maxScore,
      results,
    };
  }

  private static generateQuestions(
    operation:
      | 'addition'
      | 'subtraction'
      | 'multiplication'
      | 'division'
      | 'random',
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
  ): IMathQuestion[] {
    const questions: IMathQuestion[] = [];

    let range = 10;

    if (difficulty === 'medium') {
      range = 20;
    } else if (difficulty === 'hard') {
      range = 50;
    }

    const operations = [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ];

    for (let index = 0; index < count; index++) {
      const a = Math.floor(Math.random() * range) + 1;
      const b = Math.floor(Math.random() * range) + 1;

      let question = '';

      let answer = 0;

      const currentOperation =
        operation === 'random'
          ? operations[Math.floor(Math.random() * operations.length)]
          : operation;

      switch (currentOperation) {
        case 'addition': {
          question = `${a} + ${b}`;
          answer = a + b;

          break;
        }

        case 'subtraction': {
          question = `${Math.max(a, b)} - ${Math.min(a, b)}`;
          answer = Math.max(a, b) - Math.min(a, b);

          break;
        }

        case 'multiplication': {
          const mult1 = Math.floor(Math.random() * 12) + 1;
          const mult2 = Math.floor(Math.random() * 12) + 1;
          question = `${mult1} × ${mult2}`;
          answer = mult1 * mult2;

          break;
        }

        case 'division': {
          const divisor = Math.floor(Math.random() * 12) + 1;
          const quotient = Math.floor(Math.random() * 12) + 1;
          const dividend = divisor * quotient;
          question = `${dividend} ÷ ${divisor}`;
          answer = quotient;

          break;
        }

        default: {
          question = `${a} + ${b}`;
          answer = a + b;
        }
      }

      const options = [answer];

      while (options.length < 4) {
        let wrongAnswer: number;
        let safety = 0;

        do {
          wrongAnswer = answer + Math.floor(Math.random() * 20) - 10;
          safety++;
        } while (
          (wrongAnswer <= 0 || options.includes(wrongAnswer)) &&
          safety < 50
        );

        if (safety >= 50) wrongAnswer = answer + options.length + 1;

        options.push(wrongAnswer);
      }

      options.sort(() => Math.random() - 0.5);

      questions.push({ question, answer, options });
    }

    return questions;
  }

  static async getGameDetail(game_id: string, user_id: string, role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: {
        game_template: true,
        _count: { select: { liked: true } },
      },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    // Check permission
    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to view this game',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = game.game_json as IMathGeneratorJson;

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      is_published: game.is_published,
      creator_id: game.creator_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      settings: json.settings,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      score_per_question: json.score_per_question,
      total_played: game.total_played,
      liked_by_count: game._count.liked,
      created_at: game.created_at,
      updated_at: game.updated_at,
    };
  }

  static async updateGame(
    game_id: string,
    data: IUpdateMathGenerator,
    user_id: string,
    role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    // Check permission
    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to update this game',
      );
    }

    // Check if name already exists (exclude current game)
    if (data.name && data.name !== game.name) {
      const exist = await prisma.games.findUnique({
        where: { name: data.name },
      });

      if (exist) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name already exists',
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const currentJson = game.game_json as IMathGeneratorJson;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let newJson = { ...currentJson };

    // Check if settings changed (need to regenerate questions)
    const isSettingsChanged =
      data.operation !== undefined ||
      data.difficulty !== undefined ||
      data.question_count !== undefined;
    // Note: game_type change doesn't require question regeneration

    if (isSettingsChanged) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const newSettings = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        operation: data.operation ?? currentJson.settings.operation,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        difficulty: data.difficulty ?? currentJson.settings.difficulty,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        game_type: data.game_type ?? currentJson.settings.game_type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        theme: data.theme ?? currentJson.settings.theme,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        question_count:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.question_count ?? currentJson.settings.question_count,
      };

      const generatedQuestions = this.generateQuestions(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        newSettings.operation,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        newSettings.difficulty,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        newSettings.question_count,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      newJson = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        settings: newSettings,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        score_per_question:
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          data.score_per_question ?? currentJson.score_per_question,
        questions: generatedQuestions,
      };
    } else {
      // Only update non-question fields
      if (data.game_type !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        newJson.settings.game_type = data.game_type;
      }

      if (data.theme !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        newJson.settings.theme = data.theme;
      }

      if (data.score_per_question !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        newJson.score_per_question = data.score_per_question;
      }
    }

    // Handle thumbnail update
    let thumbnailPath = game.thumbnail_image;

    if (data.thumbnail_image) {
      // Delete old thumbnail if exists
      if (game.thumbnail_image) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await FileManager.remove(game.thumbnail_image);
      }

      thumbnailPath = await FileManager.upload(
        `game/math/${game_id}`,
        data.thumbnail_image,
      );
    }

    const updateData: Prisma.GamesUpdateInput = {
      game_json: newJson as unknown as Prisma.InputJsonValue,
      thumbnail_image: thumbnailPath,
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.is_publish !== undefined)
      updateData.is_published = data.is_publish;

    await prisma.games.update({
      where: { id: game_id },
      data: updateData,
    });

    return { id: game_id, updated: true };
  }

  static async deleteGame(game_id: string, user_id: string, role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    // Check permission
    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to delete this game',
      );
    }

    // Delete thumbnail if exists
    if (game.thumbnail_image) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await FileManager.remove(game.thumbnail_image);
    }

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id, deleted: true };
  }
}
