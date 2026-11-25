import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(
  schema: AnyZodObject | ZodEffects<AnyZodObject>,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      if (target === 'body') {
        req.body = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
