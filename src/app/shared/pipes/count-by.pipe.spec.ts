import { CountByPipe } from './count-by.pipe';

describe('CountByPipe', () => {
  it('create an instance', () => {
    const pipe = new CountByPipe();
    expect(pipe).toBeTruthy();
  });
});
