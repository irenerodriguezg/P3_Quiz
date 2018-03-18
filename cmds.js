
const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require('./model');

/**
 * Muestra la ayuda
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Comandos:");
    log(" h|help - Muestra esta ayuda.");
    log(" list - Listar los quizzes existentes.");
    log(" show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log(" add - Añadir un nuevo quiz interactivamente.");
    log(" delete <id> - Borras el quiz indicado.");
    log(" edit <id> - Editar el quiz indicado.");
    log(" test <id> - Probar el quiz indicado.");
    log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(" credits - Créditos.");
    log(" q|quit - Salir del programa");
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    models.quiz.findAll()
        .each(quiz => {
                log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

const validateId = id => {
    return new Promise((resolve, reject) => {
        if(typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        } else {
            id = parseInt(id); //coger la parte entera y descartar lo demas
            if(Number.isNaN(id)) {
                reject(new Error(`El valor del parametro <id> no es un numero.`));
            } else {
                resolve(id);
            }
        }
    });
};



/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl,id) => {
   validateId(id)
       .then(id => models.quiz.findById(id))
       .then(quiz => {
           if(!quiz) {
               throw new Error(`No existe un quiz asociado al id=${id}.`);
           }
           log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
       })
       .catch(error => {
           errorlog(error.message);
       })
       .then(() => {
           rl.prompt();
       });
};

const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};


/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y la respuesta.
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada al rl.prompt() se debe hacer en la callback de la segunda
 * llamada al rl.question.
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl =>{
    makeQuestion(rl, 'Introduzca una pregunta:')
        .then(q => {
            return makeQuestion(rl, 'Introduzca una respuesta')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(`${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar del modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Edita un quiz del modelo.
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error()(`No existe un quiz asociado al id=${id}.`);
            }
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, 'Introduzca la pregunta: ')
                .then(q=> {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, 'Introduzca la respuesta: ')
                        .then(a => {
                            quiz.question =q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', ' magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erroneo');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error=> {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error()(`No existe un quiz asociado al id=${id}.`);
            }

            return makeQuestion(rl, `${quiz.question}: `)
                .then(a => {
                    if(a.toLowerCase().trim()=== quiz.answer.toLowerCase().trim()){
                        log('Su respuesta es correcta.');
                        biglog('Correcta', 'green');
                    }
                    else{
                        log('Su respuesta es incorrecta.');
                        biglog('Incorrecta', 'red');
                    }
                    rl.prompt();
                });
        });
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todas satisfactoriamente.
 * @param rl Objeto readline usado para implementar el CLI.
 */

exports.playCmd = rl => {

    let score = 0;
    let toBePlayed = [];

    models.quiz.findAll({raw:true})
        .then(quizzes => {
            toBePlayed = quizzes;
        })

    const playOne = () =>{

        return Promise.resolve()
            .then(() => {
                if (toBePlayed.length <= 0) {
                    console.log("FINAL");
                    return;
                }

                let pos = Math.floor(Math.random() * toBePlayed.length);
                let quiz = toBePlayed[pos];
                toBePlayed.splice(pos, 1);

                return makeQuestion(rl, quiz.question)
                    .then(answer => {
                        if (answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
                            score++;
                            console.log("Respuesta correcta");
                            return playOne();
                        } else {
                            console.log("Respuesta incorrecta");
                        }
                    })

            })
    }
    models.quiz.findAll({raw:true})
        .then (quizzes => {
            toBePlayed = quizzes;
        })
        .then(() => {
            return playOne();

        })
        .catch (e =>{
            console.log("Error: " + e);
        })
        .then(() => {
            console.log(score);
            rl.prompt();
        })
};


/**exports.playCmd = rl => {

    let score = 0;

    let toBeResolved = [];

    const playOne = () =>{
        return new Promise((resolve, reject) => {

            if (toBeResolved.length == 0) {
                log("No hay más preguntas.");
                log("Fin del examen. Aciertos:");
                biglog(score, "magenta");
                //rl.prompt();
            }
            let id_random = Math.floor(Math.random() * toBeResolved.length);
            let quiz = toBeResolved[id_random];
            toBeResolved.splice(id_random, 1);

            return makeQuestion(rl, quiz.question)

                .then(answer => {
                    respuesta = answer.toLowerCase().trim();
                    respuesta2 = quiz.answer.toLowerCase().trim();
                    if (respuesta === respuesta2) {
                        score++;
                        biglog("Correcto", 'green');
                        log(`CORRECTO - Lleva ${score} aciertos.`);
                        playOne();

                    } else {
                        log("INCORRECTO.");
                        biglog("Incorrecto", 'red');
                        log("Fin del examen. Aciertos:");
                        biglog(score, "magenta");
                        rl.prompt();
                    }
                })
                .catch(error => {
                    console.log(error);
                })

        })
    }
    models.quiz.findAll({raw: true})
        .then(quizzes =>{
            toBeResolved=quizzes;
        })
        .then(()=>{
            return playOne();
        })
        .catch(error => {
            console.log(error);
        })
        .then(()=>{
            console.log(score);
            rl.prompt();
        })

};
*/



/**
 * Muestra los nombres de los autores de la practica.
 * @param rl Objeto readline usado para implementar el CLI.
 */

exports.creditsCmd = rl =>{
    log('Autores de la práctica:');
    log('Irene Rodríguez Gómez', 'green');
    rl.prompt();
};

/**
 * Terminar el programa.
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = rl => {
    rl.close();
};
