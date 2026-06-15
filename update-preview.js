const fs = require('fs');

// 1. Update CreateLetterDto
let dto = fs.readFileSync('src/modules/letters/dto/create-letter.dto.ts', 'utf8');
if (!dto.includes('htmlContent')) {
  dto = dto.replace(
    /content: Record<string, unknown>;/,
    "content: Record<string, unknown>;\n\n  @ApiProperty({ required: false })\n  @IsOptional()\n  htmlContent?: string;"
  );
  fs.writeFileSync('src/modules/letters/dto/create-letter.dto.ts', dto);
}

// 2. Update LettersController
// Actually, no changes needed in controller because CreateLetterDto handles it.

// 3. Update LettersService
let service = fs.readFileSync('src/modules/letters/letters.service.ts', 'utf8');
const oldPreview = `  async previewDraftPdf(dto: CreateLetterDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId, false);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
      include: { category: true },
    });
    if (template.categoryId !== dto.categoryId) {
      throw new BadRequestException('Template does not belong to the selected category');
    }
    if (template.letterTypeId && template.letterTypeId !== dto.letterTypeId) {
      throw new BadRequestException('Template does not belong to the selected letter type');
    }
    const letterType = dto.letterTypeId
      ? await this.prisma.letterType.findUnique({ where: { id: dto.letterTypeId } })
      : null;

    const letterDate = this.resolveLetterDate(dto.content);
    const previewNumber = dto.content?.letter_sequence
      ? await this.numbering.previewWithSequence(dto.categoryId, dto.letterTypeId, dto.content.letter_sequence as number, letterDate)
      : await this.numbering.previewBlankSequence(dto.categoryId, dto.letterTypeId, this.resolveLetterDateValue(dto.content));

    const numberingVariables = this.toNumberingVariables(previewNumber);

    return this.documents.renderPreview(
      template.templateContent,
      this.withNumberingContent(dto.content, numberingVariables),
      previewNumber.letterNumber,
    );
  }`;

const newPreview = `  async previewDraftPdf(dto: CreateLetterDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId, false);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
      include: { category: true },
    });
    if (template.categoryId !== dto.categoryId) {
      throw new BadRequestException('Template does not belong to the selected category');
    }
    if (template.letterTypeId && template.letterTypeId !== dto.letterTypeId) {
      throw new BadRequestException('Template does not belong to the selected letter type');
    }
    const letterType = dto.letterTypeId
      ? await this.prisma.letterType.findUnique({ where: { id: dto.letterTypeId } })
      : null;

    const letterDate = this.resolveLetterDate(dto.content);
    const previewNumber = dto.content?.letter_sequence
      ? await this.numbering.previewWithSequence(dto.categoryId, dto.letterTypeId, dto.content.letter_sequence as number, letterDate)
      : await this.numbering.previewBlankSequence(dto.categoryId, dto.letterTypeId, this.resolveLetterDateValue(dto.content));

    const numberingVariables = this.toNumberingVariables(previewNumber);
    const contentToRender = dto.htmlContent || template.templateContent;

    return this.documents.renderPreview(
      contentToRender,
      this.withNumberingContent(dto.content, numberingVariables),
      previewNumber.letterNumber,
    );
  }`;
if (service.includes('template.templateContent,')) {
  service = service.replace(oldPreview, newPreview);
  fs.writeFileSync('src/modules/letters/letters.service.ts', service);
}
