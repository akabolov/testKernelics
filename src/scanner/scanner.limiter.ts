import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVariables } from './scanner.consts';

@Injectable()
export class AsyncLimiter {
  private _queue: any[] = [];
  private _concurrencyLimit: number;
  private _running: number = 0;

  constructor(private configService: ConfigService) {
    this._concurrencyLimit = +this.configService.getOrThrow(
      EnvVariables.concurrencyLimit,
    );
  }

  public getLimiter() {
    return (asyncFn: () => Promise<any>) => {
      return new Promise<any>((resolve) => {
        this._queue.push({
          asyncFn,
          resolve,
        });

        this.next();
      });
    };
  }

  private next() {
    if (this._queue.length === 0) {
      return;
    }

    if (this._running >= this._concurrencyLimit) {
      return;
    }

    this._running++;

    const queueItem = this._queue.shift();

    queueItem.resolve(
      queueItem.asyncFn().then(
        (value: any) => {
          this._running--;
          this.next();
          return value;
        },
        (error) => {
          this._running--;
          this.next();
          throw error;
        },
      ),
    );
  }
}
