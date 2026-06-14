const fs = require('fs');
let service = fs.readFileSync('src/modules/letters/letters.service.ts', 'utf8');

// In create()
const oldCreate = `  async create(actorId: string, dto: CreateLetterDto) {
    await this.validateLetterType(dto.categoryId, dto.letterTypeId);
    await this.validateManualLetterNumber(dto.categoryId, dto.letterTypeId, dto.content);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
    });`;

const newCreate = `  async create(actorId: string, dto: CreateLetterDto) {
    if (dto.htmlContent) {
      dto.content = { ...dto.content, htmlContent: dto.htmlContent };
    }
    await this.validateLetterType(dto.categoryId, dto.letterTypeId);
    await this.validateManualLetterNumber(dto.categoryId, dto.letterTypeId, dto.content);
    const template = await this.prisma.letterTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
    });`;
service = service.replace(oldCreate, newCreate);

// In update()
const oldUpdate = `  async update(actorId: string, id: string, dto: UpdateLetterDto) {
    const oldValue = await this.findOne(id);
    if (oldValue.status !== 'DRAFT' && oldValue.status !== 'REVISION_REQUESTED') {
      throw new ForbiddenException('Only draft or revision letters can be updated');
    }`;

const newUpdate = `  async update(actorId: string, id: string, dto: UpdateLetterDto) {
    const oldValue = await this.findOne(id);
    if (dto.htmlContent) {
      dto.content = { ...dto.content, htmlContent: dto.htmlContent };
    }
    if (oldValue.status !== 'DRAFT' && oldValue.status !== 'REVISION_REQUESTED') {
      throw new ForbiddenException('Only draft or revision letters can be updated');
    }`;
service = service.replace(oldUpdate, newUpdate);

// Now in preview(id: string) which is used for viewing created letters!
// We must render `htmlContent` if it exists!
const oldPreviewId = `  async preview(id: string) {
    const letter = await this.findOne(id);
    return {
      letterId: letter.id,
      letterNumber: letter.letterNumber,
      content: await this.documents.renderPreview(
        letter.template.templateContent,
        this.withNumberingContent(letter.content as Record<string, unknown>, letter),
        letter.letterNumber,
      ),
    };
  }`;

const newPreviewId = `  async preview(id: string) {
    const letter = await this.findOne(id);
    const contentToRender = (letter.content as Record<string, unknown>)?.htmlContent as string || letter.template.templateContent;
    return {
      letterId: letter.id,
      letterNumber: letter.letterNumber,
      content: await this.documents.renderPreview(
        contentToRender,
        this.withNumberingContent(letter.content as Record<string, unknown>, letter),
        letter.letterNumber,
      ),
    };
  }`;
service = service.replace(oldPreviewId, newPreviewId);

// Also update `generatePdf` and `generateDocx` (which is legacy but exists) to use `htmlContent`.
const oldGeneratePdf = `  async generatePdf(actorId: string, id: string) {
    const letter = await this.findOne(id);
    if (!letter.letterNumber) throw new BadRequestException('Letter number is required');

    const pdfBuffer = await this.documents.generatePdf(
      letter.template.templateContent,
      this.withNumberingContent(letter.content as Record<string, unknown>, letter),
      letter.letterNumber,
    );`;

const newGeneratePdf = `  async generatePdf(actorId: string, id: string) {
    const letter = await this.findOne(id);
    if (!letter.letterNumber) throw new BadRequestException('Letter number is required');

    const contentToRender = (letter.content as Record<string, unknown>)?.htmlContent as string || letter.template.templateContent;
    const pdfBuffer = await this.documents.generatePdf(
      contentToRender,
      this.withNumberingContent(letter.content as Record<string, unknown>, letter),
      letter.letterNumber,
    );`;
service = service.replace(oldGeneratePdf, newGeneratePdf);

fs.writeFileSync('src/modules/letters/letters.service.ts', service);
