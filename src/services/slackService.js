module.exports = {
  register(app) {
    require('../slack/events')(app);
    require('../slack/commands')(app);
    require('../slack/handlers/interactions')(app);
  },
};
