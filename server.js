const cluster = require('cluster');
const os = require('os');
const app = require('./app'); //app logic

if (cluster.isMaster) {
    const numCPUs = os.cpus().length;
    console.log(`Master process ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    app.listen(3000, () => {
        console.log(`Worker ${process.pid} started`);
    });
}
