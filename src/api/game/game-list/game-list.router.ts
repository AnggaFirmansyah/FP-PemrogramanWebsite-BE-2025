import { Router } from 'express';

import { AnagramController } from './anagram/anagram.controller';
import { MathGeneratorController } from './math-generator/math-generator.controller';
import { MazeChaseController } from './maze-chase/maze-chase.controller';
import { PairOrNoPairController } from './pair-or-no-pair/pair-or-no-pair.controller';
import { QuizController } from './quiz/quiz.controller';
import { SlidingPuzzleController } from './sliding-puzzle/sliding-puzzle.controller';
import { SpeedSortingController } from './speed-sorting/speed-sorting.controller';
import { SpinTheWheelController } from './spin-the-wheel/spin-the-wheel.controller';
import { TrueOrFalseController } from './true-or-false/true-or-false.controller';
import { TypeSpeedController } from './type-speed/type-speed.controller';

const gameListRouter = Router();

gameListRouter.use('/math-generator', MathGeneratorController);
gameListRouter.use('/quiz', QuizController);
gameListRouter.use('/maze-chase', MazeChaseController);
gameListRouter.use('/speed-sorting', SpeedSortingController);
gameListRouter.use('/anagram', AnagramController);
gameListRouter.use('/pair-or-no-pair', PairOrNoPairController);
gameListRouter.use('/type-speed', TypeSpeedController);
gameListRouter.use('/sliding-puzzle', SlidingPuzzleController);
gameListRouter.use('/true-or-false', TrueOrFalseController);
gameListRouter.use('/spin-the-wheel', SpinTheWheelController);

export { gameListRouter };
