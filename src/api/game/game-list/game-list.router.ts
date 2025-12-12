import { Router } from 'express';

import { AnagramController } from './anagram/anagram.controller';
import { MathGeneratorController } from './math-generator/math-generator.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';

const gameListRouter = Router();

gameListRouter.use('/math-generator', MathGeneratorController);
gameListRouter.use('/quiz', QuizController);
gameListRouter.use('/maze-chase', MazeChaseController);
gameListRouter.use('/speed-sorting', SpeedSortingController);
gameListRouter.use('/anagram', AnagramController);
gameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
gameListRouter.use('/type-speed', TypeSpeedController);

export { gameListRouter };
