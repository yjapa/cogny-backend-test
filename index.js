const { DATABASE_SCHEMA, DATABASE_URL, SHOW_PG_MONITOR } = require('./config');
const massive = require('massive');
const monitor = require('pg-monitor');
const { getData, sumPopulation } = require('./api');

// Call start
(async () => {
    console.log('main.js: before start');

    const db = await massive({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }, {
        // Massive Configuration
        scripts: process.cwd() + '/migration',
        allowedSchemas: [DATABASE_SCHEMA],
        whitelist: [`${DATABASE_SCHEMA}.%`],
        excludeFunctions: true,
    }, {
        // Driver Configuration
        noWarnings: true,
        error: function (err, client) {
            console.log(err);
            //process.emit('uncaughtException', err);
            //throw err;
        }
    });

    if (!monitor.isAttached() && SHOW_PG_MONITOR === 'true') {
        monitor.attach(db.driverConfig);
    }

    const execFileSql = async (schema, type) => {
        return new Promise(async resolve => {
            const objects = db['user'][type];

            if (objects) {
                for (const [key, func] of Object.entries(objects)) {
                    console.log(`executing ${schema} ${type} ${key}...`);
                    await func({
                        schema: DATABASE_SCHEMA,
                    });
                }
            }

            resolve();
        });
    };

    //public
    const migrationUp = async () => {
        return new Promise(async resolve => {
            await execFileSql(DATABASE_SCHEMA, 'schema');

            //cria as estruturas necessarias no db (schema)
            await execFileSql(DATABASE_SCHEMA, 'table');
            await execFileSql(DATABASE_SCHEMA, 'view');

            console.log(`reload schemas ...`)
            await db.reload();

            resolve();
        });
    };

    try {
        await migrationUp();

        const data = await getData();

        await db[DATABASE_SCHEMA].api_data.destroy({})

        //exemplo de insert

        await data.map(elem => {
            db[DATABASE_SCHEMA].api_data.insert({
                doc_record: elem
            })
        })

        //Somatória em memória
        const sumInMemory = await sumPopulation(data);

        console.log('Result in memory:', sumInMemory);

        //Usando select
        const sumWithQuery = await db.query(
            `SELECT SUM((doc_record ->> 'Population')::int) AS data
            FROM ${DATABASE_SCHEMA}.api_data
            WHERE (doc_record->>'Year')::int BETWEEN 2018 AND 2020;`
        )

        console.log('Result with SELECT', sumWithQuery[0].data);

        //exemplo select
        const result2 = await db[DATABASE_SCHEMA].api_data.find({
            is_active: true
        });
        console.log('result2 >>>', result2);

    } catch (e) {
        console.log(e.message)
    } finally {
        console.log('finally');
    }
    console.log('main.js: after start');
})();