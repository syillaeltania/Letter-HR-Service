const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

const badLoop = `  for (const template of templates) {
    const category = await prisma.letterCategory.upsert({
      where: { categoryCode: template.categoryCode },
      update: {
        categoryName: template.categoryName,
        isActive: true,
      },
      create: {
        categoryName: template.categoryName,
        categoryCode: template.categoryCode,
        isActive: true,
      },
    });

    let letterType = null;
    if (template.letterTypeCode) {
      letterType = await prisma.letterType.upsert({
        where: { typeCode: template.letterTypeCode },
        update: {
          typeName: template.letterTypeName,
          numberingFormat: template.numberingFormat,
          categoryId: category.id,
          isActive: true,
        },
        create: {
          typeName: template.letterTypeName,
          typeCode: template.letterTypeCode,
          numberingFormat: template.numberingFormat,
          categoryId: category.id,
          isActive: true,
        },
      });
    }

    await prisma.letterTemplate.upsert({
      where: {
        categoryId_templateName_version: {
          categoryId: category.id,
          templateName: template.templateName,
          version: 1,
        },
      },
      update: {
        letterTypeId: letterType ? letterType.id : null,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        status: TemplateStatus.ACTIVE,
      },
      create: {
        categoryId: category.id,
        letterTypeId: letterType ? letterType.id : null,
        templateName: template.templateName,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        version: 1,
        status: TemplateStatus.ACTIVE,
      },
    });
  }`;

const goodLoop = `  for (const template of templates) {
    const category = await prisma.letterCategory.upsert({
      where: { categoryCode: template.categoryCode },
      update: {
        categoryName: template.categoryName,
        numberingFormat: template.numberingFormat,
        isActive: true,
      },
      create: {
        categoryName: template.categoryName,
        categoryCode: template.categoryCode,
        numberingFormat: template.numberingFormat,
        isActive: true,
      },
    });

    let letterType = null;
    if (template.letterTypeCode) {
      letterType = await prisma.letterType.upsert({
        where: { categoryId_typeCode: { categoryId: category.id, typeCode: template.letterTypeCode } },
        update: {
          typeName: template.letterTypeName,
          isActive: true,
        },
        create: {
          typeName: template.letterTypeName,
          typeCode: template.letterTypeCode,
          categoryId: category.id,
          isActive: true,
        },
      });
    }

    await prisma.letterTemplate.upsert({
      where: {
        categoryId_templateName_version: {
          categoryId: category.id,
          templateName: template.templateName,
          version: 1,
        },
      },
      update: {
        letterTypeId: letterType ? letterType.id : null,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        status: TemplateStatus.ACTIVE,
      },
      create: {
        categoryId: category.id,
        letterTypeId: letterType ? letterType.id : null,
        templateName: template.templateName,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        version: 1,
        status: TemplateStatus.ACTIVE,
      },
    });
  }`;

seed = seed.replace(badLoop, goodLoop);
fs.writeFileSync('prisma/seed.ts', seed);
