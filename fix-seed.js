const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

// Change the `templates` array definitions to specify `categoryCode` and `letterTypeCode`
// Wait, actually I can just use a regex replace to update the structure.
// Let's replace the first template definition:
seed = seed.replace(/categoryName: 'Kontrak Kerja Karyawan',\n\s*categoryCode: 'KK\.01',/, "categoryName: 'Kontrak Kerja',\n    categoryCode: 'KK',\n    letterTypeName: 'Kontrak Kerja Karyawan',\n    letterTypeCode: 'KK.01',");
seed = seed.replace(/categoryName: 'Kontrak Kerja Magang',\n\s*categoryCode: 'KK\.02',/, "categoryName: 'Kontrak Kerja',\n    categoryCode: 'KK',\n    letterTypeName: 'Kontrak Kerja Magang',\n    letterTypeCode: 'KK.02',");
seed = seed.replace(/categoryName: 'Kontrak Kerja Freelancer',\n\s*categoryCode: 'KK\.03',/, "categoryName: 'Kontrak Kerja',\n    categoryCode: 'KK',\n    letterTypeName: 'Kontrak Kerja Pekerja Lepas',\n    letterTypeCode: 'KK.03',");
seed = seed.replace(/categoryName: 'Offering Letter',\n\s*categoryCode: 'KK\.01-OL',/, "categoryName: 'Kontrak Kerja',\n    categoryCode: 'KK',\n    letterTypeName: 'Offering Letter',\n    letterTypeCode: 'KK.01-OL',");

// Now update the main seeding loop
const oldLoop = `  for (const template of templates) {
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

    await prisma.letterTemplate.upsert({
      where: {
        categoryId_templateName_version: {
          categoryId: category.id,
          templateName: template.templateName,
          version: 1,
        },
      },
      update: {
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        status: TemplateStatus.ACTIVE,
      },
      create: {
        categoryId: category.id,
        templateName: template.templateName,
        templateContent: htmlWrapper(template.content),
        placeholders: [...new Set([...globalNumberingPlaceholders, ...template.placeholders])],
        version: 1,
        status: TemplateStatus.ACTIVE,
      },
    });
  }`;

const newLoop = `  for (const template of templates) {
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

seed = seed.replace(oldLoop, newLoop);
fs.writeFileSync('prisma/seed.ts', seed);
