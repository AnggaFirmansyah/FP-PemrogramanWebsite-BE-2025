import { Router } from 'express';

import { MathGeneratorController } from './math-generator/math-generator.controller';
import { AnagramController } from './anagram/anagram.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';

const gameListRouter = Router();

gameListRouter.use('/math-generator', MathGeneratorController);
GameListRouter.use('/quiz', QuizController);
GameListRouter.use('/maze-chase', MazeChaseController);
GameListRouter.use('/speed-sorting', SpeedSortingController);
GameListRouter.use('/anagram', AnagramController);
GameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
GameListRouter.use('/type-speed', TypeSpeedController);

export { gameListRouter };
