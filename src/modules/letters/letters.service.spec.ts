import { LettersService } from './letters.service';

describe('LettersService previewDraftPdf', () => {
  it('renders the edited htmlContent when provided', async () => {
    const prisma = {
      letterTemplate: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'template-1',
          categoryId: 'category-1',
          letterTypeId: 'type-1',
          templateContent: '<p>database template</p>',
          category: { categoryCode: 'KK' },
        }),
      },
      letterType: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({ id: 'type-1', typeCode: 'KK.01' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'type-1', categoryId: 'category-1', isActive: true }),
      },
    };
    const documents = {
      generatePdf: jest.fn().mockResolvedValue('/tmp/preview.pdf'),
    };
    const numbering = {
      parseLetterDate: jest.fn().mockReturnValue(new Date('2026-06-12T00:00:00')),
      previewWithSequenceUnchecked: jest.fn().mockResolvedValue({
        letterNumber: 'NW-012/KK.01/HCM/VI/2026',
        sequenceNumber: 12,
        letterSequence: '012',
        letterTypeCode: 'KK.01',
        letterCategoryCode: 'KK',
        letterMonthRoman: 'VI',
        letterYear: 2026,
      }),
    };

    const service = new LettersService(
      prisma as any,
      documents as any,
      {} as any,
      {} as any,
      numbering as any,
    );

    await service.previewDraftPdf({
      categoryId: 'category-1',
      letterTypeId: 'type-1',
      templateId: 'template-1',
      content: { letter_sequence: '012', letter_date: '2026-06-12' },
      htmlContent: '<p>edited editor template</p>',
    } as any);

    expect(documents.generatePdf).toHaveBeenCalledWith(
      '<p>edited editor template</p>',
      expect.any(Object),
      'NW-012/KK.01/HCM/VI/2026',
    );
  });
});
