const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const common = require('./common');
const exercise = require('./exercise');
const quiz = require('./quiz');


const partTypes = {
  read: 'read',
  lectura: 'read',
  leitura: 'read',
  seminar: 'seminar',
  seminario: 'seminar',
  seminário: 'seminar',
  webinar: 'seminar',
  oficina: 'workshop',
  workshop: 'workshop',
  taller: 'workshop',
  quiz: 'quiz',
  practice: 'practice',
  exercício: 'practice',
  práctica: 'practice', // ?????
  cuestionario: 'other', // ????
  producto: 'practice', // ???? Prácticas sin ejercicios del LMS (libres)
  video: 'read', // ???? este sólo aparece en progreso, no en cursos???
};


const partFormats = {
  guided: 'guided',
  guiado: 'guided',
  'self-paced': 'self-paced',
  individual: 'self-paced',
};


module.exports = dir => promisify(fs.readdir)(dir)
  .then((files) => {
    if (files.indexOf('README.md') === -1) {
      throw Object.assign(new Error('Part is missing README.md'), {
        path: dir,
        type: 'part',
      });
    }

    return promisify(fs.readFile)(path.join(dir, 'README.md'), 'utf8')
      .then(readme => [readme, files]);
  })
  .then(([readme, files]) => {
    const parsedReadme = common.parseReadme(readme, {
      tipo: 'type',
      type: 'type',
      formato: 'format',
      format: 'format',
      duración: 'duration',
      duration: 'duration',
      duração: 'duration',
    });

    Object.assign(parsedReadme, {
      duration: common.parseDuration(parsedReadme.duration),
      format: partFormats[parsedReadme.format],
      type: partTypes[parsedReadme.type],
    });

    if (parsedReadme.duration === null) {
      throw Object.assign(new Error('Could not parse part duration'), {
        path: dir,
        type: 'part',
      });
    }

    if (parsedReadme.type === 'practice') {
      return Promise.all(
        files
          .filter(common.isDirname)
          .map(file => exercise(path.join(dir, file))),
      )
        .then(all => all.reduce(
          (memo, { slug, ...item }) => ({ ...memo, [slug]: item }),
          {},
        ))
        .then(exercises => ({
          ...parsedReadme,
          exercises,
        }));
    }

    if (parsedReadme.type === 'quiz') {
      return Object.keys(parsedReadme).reduce(
        (memo, key) => (
          (key === 'body')
            ? memo
            : { ...memo, [key]: parsedReadme[key] }
        ),
        {
          questions: quiz(parsedReadme.body),
        },
      );
    }

    return parsedReadme;
  });
