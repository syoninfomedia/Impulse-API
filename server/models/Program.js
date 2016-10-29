var async = require("async");
module.exports = function(Program) {
  /*********************** VALIDATIONS STARTS*******************/

  //Program.validatesUniquenessOf('name', { message: 'Name is already in use.' });

  /*********************** VALIDATIONS ENDS*******************/
  Program.saveProgram = function(data, cb) {
    var ProgramScheduleModel = Program.app.models.ProgramSchedule;
    var ExerciseModel = Program.app.models.Exercise;
    var schedulesArr = [], schedulesArrCopy = [], exerciseArr = [];
    if (data && data.schedules && data.schedules.length) {
      schedulesArrCopy = schedulesArr = data.schedules; // store schedule in arr
      try {
        delete data.schedules // delete from data obj
      }
      catch (e) {
        // no need to handle
      }
    }
    async.waterfall([
        function(callback) {
          Program.create(data, function (err, savedProgramObj) {
            if (err)
              return callback(err, null);
            return callback(null, savedProgramObj);
          });
        },
        function(savedProgramObj, callback) {
          if (schedulesArr && schedulesArr.length && savedProgramObj && savedProgramObj.id) {
            schedulesArr.forEach(function(sch, key) {
              sch.programId = savedProgramObj.id;
              if (sch.exerciseId && sch.exerciseId.length) {
                exerciseArr = exerciseArr.concat(sch.exerciseId.filter(function(v){return v && v.name;}));
              }
            });
            if (exerciseArr && exerciseArr.length) {
              ExerciseModel.create(exerciseArr, function (err, docs) {
                if (err)
                  return callback(err, null);
                //
                ProgramScheduleModel.create(schedulesArr, function (err, docs) {
                  if (err)
                    return callback(err, null);
                  return callback(null, savedProgramObj);
                });
              });
            }
            else {
              ProgramScheduleModel.create(schedulesArr, function (err, docs) {
                if (err)
                  return callback(err, null);
                return callback(null, savedProgramObj);
              });
            }
          }
          else
          return callback(null, savedProgramObj);
        }
      ],
      function(err, data) {
        if (err) {
          return cb(err);
        }
        if(data && data.id) {
          cb(null, data);

        }else {
          var err = new Error('Could not create program');
          err.status = err.statusCode = 422;
          err.code = 'CANT_CREATE_PROGRAM';
          return cb(err);
        }
      });

  };

  //Create a remote method to add teams in Challenges
  Program.remoteMethod('saveProgram', {
    http: {path: '/saveProgram', verb: 'post'},
    accepts: [
      {arg: 'data', type: 'object', http: {source: 'body'}, required: true}
    ],
    returns: {root: true, type: 'object'},
    description: 'Add Program with schedules and exercises'
  });
};
