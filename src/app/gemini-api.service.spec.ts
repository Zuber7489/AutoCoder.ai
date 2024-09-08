import { TestBed } from '@angular/core/testing';

import { GeminiApiService } from './gemini-api.service';

describe('GeminiApiService', () => {
  let service: GeminiApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
