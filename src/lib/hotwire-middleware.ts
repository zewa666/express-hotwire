import { NextFunction, Request, Response } from 'express';

type TurboStreamActionResponseHandler = (
  target: string,
  options?: StreamOptions
) => void;

/**
 * Object that is added to the Response object when using the expressHotwire middleware.
 * It can be used to send turbo stream responses.
 *
 * ```js
 * const expressHotwire = require('express-hotwire');
 *
 * app.use(expressHotwire());
 *
 * app.post('/messages', (req, res) => {
 *  res.turboStream.append('messages', {
 *    partial: 'messages/show',
 *    locals: {
 *      message: {
 *        id: 1,
 *        content: 'My new message',
 *      }
 *    }
 *  });
 * });
 * ```
 */
export type TurboStream = Record<
  TurboStreamActions,
  TurboStreamActionResponseHandler
>;

type Locals = Record<string, unknown>;

type StreamOptions = {
  readonly partial: string;
  readonly locals?: Locals;
};

enum TurboStreamActions {
  append = 'append',
  prepend = 'prepend',
  replace = 'replace',
  update = 'update',
  remove = 'remove',
}

/**
 * @ignore
 */
const render = (
  res: Response,
  partial: string,
  locals?: Locals
): Promise<string> => {
  return new Promise((resolve, reject) => {
    res.render(partial, locals, (err, html) => {
      if (err) {
        reject(err);
      } else {
        resolve(html);
      }
    });
  });
};

/**
 * @ignore
 */
const stream = async (
  res: Response,
  target: string,
  action: TurboStreamActions,
  options?: StreamOptions
) => {
  const content = options?.partial
    ? await render(res, options.partial, options.locals)
    : '';

  return `
  <turbo-stream action="${action}" target="${target}">
    <template>
${content}
    </template>
  </turbo-stream>
  `;
};

/**
 * Express Middleware function used to add turboStream object to the Response for sending
 * turbo stream responses.
 *
 * After using this middleware you should have access to the res.turboStream object
 *
 * @param _req Express Request
 * @param res Express Response
 * @param next Express NextFunction
 */
export const middleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const streamActionHandler = (
    action: TurboStreamActions
  ): TurboStreamActionResponseHandler => async (
    target: string,
    options?: StreamOptions
  ) => {
    res.setHeader('Content-Type', ['text/html; turbo-stream; charset=utf-8']);
    res.send(await stream(res, target, action, options));
  };

  const turboStream: TurboStream = {
    append: streamActionHandler(TurboStreamActions.append),
    prepend: streamActionHandler(TurboStreamActions.prepend),
    replace: streamActionHandler(TurboStreamActions.replace),
    update: streamActionHandler(TurboStreamActions.update),
    remove: streamActionHandler(TurboStreamActions.remove),
  };

  res.turboStream = turboStream;

  next();
};

/**
 * This function is the default export from this library and is to be used when calling `app.use`.
 *
 * ### Example
 *
 * ```js
 * const expressHotwire = require('express-hotwire');
 *
 * app.use(expressHotwire());
 * ```
 */
export const buildMiddleware = () => middleware;
