import { Client } from 'pg';
import { prisma } from './client';

const createDbIfNotExists = async () => {
    const client = new Client({
        user: 'postgres',
        host: 'localhost', // replace with your PostgreSQL host if needed
        password: '8663',
        port: 5432,
        database: 'postgres', // connect to default DB first
    });

    await client.connect();

    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname='wwii'`);
    if (res.rowCount === 0) {
        await client.query('CREATE DATABASE wwii');
        console.log('Database "wwii" created.');
    } else {
        console.log('Database "wwii" already exists.');
    }

    await client.end();
};

const seedData = async () => {
    console.log("Seeding Entities...");
    // Create common Entities
    const alice   = await prisma.entity.create({ data: { name: "Alice", type: "person" } });
    const london  = await prisma.entity.create({ data: { name: "London", type: "location" } });
    const acme    = await prisma.entity.create({ data: { name: "Acme Corp.", type: "organization" } });
    const date1   = await prisma.entity.create({ data: { name: "2025-04-30", type: "date", date: new Date("2025-04-30").toISOString() } });
    const paris   = await prisma.entity.create({ data: { name: "Paris", type: "location" } });
    const bulge   = await prisma.entity.create({ data: { name: "Battle of the Bulge", type: "event" } });
    const dailyNews = await prisma.entity.create({ data: { name: "Daily News", type: "organization" } });
    const date2   = await prisma.entity.create({ data: { name: "1944-06-06", type: "date", date: new Date("1944-06-06").toISOString() } });

    console.log("Seeding Documents...");
    // Document 1: letter
    await prisma.document.create({
        data: {
            title: "Letter from Alice",
            fileName: "letter_alice.txt",
            content: "This is a sample document of type letter.",
            documentType: "letter",
            entities: {
                connect: [{ id: alice.id }, { id: london.id }]
            }
        }
    });

    // Document 2: report
    await prisma.document.create({
        data: {
            title: "Acme Corp Report",
            fileName: "acme_report.pdf",
            content: "This is a sample document of type report.",
            documentType: "report",
            entities: {
                connect: [{ id: acme.id }, { id: date1.id }]
            }
        }
    });

    // Document 3: photo
    await prisma.document.create({
        data: {
            title: "Paris Photo",
            fileName: "paris_photo.jpg",
            content: "This is a sample document of type photo.",
            documentType: "photo",
            entities: {
                connect: [{ id: paris.id }]
            }
        }
    });

    // Document 4: diary_entry
    await prisma.document.create({
        data: {
            title: "Battle Diary Entry",
            fileName: "battle_diary.txt",
            content: "This is a sample document of type diary_entry.",
            documentType: "diary_entry",
            entities: {
                connect: [{ id: bulge.id }]
            }
        }
    });

    // Document 5: newspaper
    await prisma.document.create({
        data: {
            title: "Daily News Article",
            fileName: "daily_news.pdf",
            content: "This is a sample document of type newspaper.",
            documentType: "newspaper",
            entities: {
                connect: [{ id: dailyNews.id }, { id: date2.id }]
            }
        }
    });

    // Additional Document: list (with multiple entities)
    await prisma.document.create({
        data: {
            title: "Entity List",
            fileName: "entity_list.txt",
            content: "This is a sample document of type list.",
            documentType: "list",
            entities: {
                connect: [{ id: alice.id }, { id: acme.id }, { id: paris.id }]
            }
        }
    });

    // Additional Document: book
    await prisma.document.create({
        data: {
            title: "World War II History Book",
            fileName: "ww2_history.pdf",
            content: "This is a sample document of type book.",
            documentType: "book",
            entities: {
                connect: [{ id: bulge.id }, { id: date2.id }, { id: paris.id }]
            }
        }
    });
};

const fetchAndPrint = async () => {
    const documents = await prisma.document.findMany({
        include: {
            entities: true,
        },
    });
    console.log("Documents in DB:", documents);
};

const main = async () => {
    try {
        await createDbIfNotExists();

        // Apply Prisma schema changes
        console.log('Pushing Prisma schema...');
        await import('child_process').then(({ execSync }) => {
            execSync('npx prisma db push', { stdio: 'inherit' });
        });

        await seedData();
        await fetchAndPrint();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
};

main();
