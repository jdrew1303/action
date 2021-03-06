import getRethink from 'server/database/rethinkDriver';
import {GraphQLNonNull, GraphQLID, GraphQLList} from 'graphql';
import getRequestedFields from 'server/graphql/getRequestedFields';
import {Project} from './projectSchema';
import {requireSUOrTeamMember, requireTeamIsPaid} from 'server/utils/authorization';
import makeChangefeedHandler from 'server/utils/makeChangefeedHandler';

export default {
  agendaProjects: {
    type: new GraphQLList(Project),
    args: {
      agendaId: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The ID of the agenda item'
      }
    },
    async resolve(source, {agendaId}, {authToken, socket, subbedChannelName}, refs) {
      const r = getRethink();

      // AUTH
      // teamMemberId is of format 'userId::teamId'
      const teamId = await r.table('AgendaItem').get(agendaId)('teamId');
      requireSUOrTeamMember(authToken, teamId);
      await requireTeamIsPaid(teamId);

      // RESOLUTION
      const requestedFields = getRequestedFields(refs);
      const changefeedHandler = makeChangefeedHandler(socket, subbedChannelName);
      r.table('Project')
        .getAll(agendaId, {index: 'agendaId'})
        .pluck(requestedFields)
        .changes({includeInitial: true})
        .run({cursor: true}, changefeedHandler);
    }
  },
  projects: {
    type: new GraphQLList(Project),
    args: {
      teamMemberId: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The unique team member ID'
      }
    },
    async resolve(source, {teamMemberId}, {authToken, socket, subbedChannelName}, refs) {
      const r = getRethink();

      // AUTH
      // teamMemberId is of format 'userId::teamId'
      const [, teamId] = teamMemberId.split('::');
      requireSUOrTeamMember(authToken, teamId);
      await requireTeamIsPaid(teamId);
      const myTeamMemberId = `${authToken.sub}::${teamId}`;
      // RESOLUTION
      const requestedFields = getRequestedFields(refs);
      const removalFields = ['id', 'teamMemberId'];
      const changefeedHandler = makeChangefeedHandler(socket, subbedChannelName, {removalFields});
      r.table('Project')
        .getAll(teamMemberId, {index: 'teamMemberId'})
        .filter((project) => project('tags')
          .contains('#private').and(project('teamMemberId').ne(myTeamMemberId))
          .or(project('tags').contains('#archived'))
          .not())
        .pluck(requestedFields)
        .changes({includeInitial: true})
        .run({cursor: true}, changefeedHandler);
    }
  },
  archivedProjects: {
    type: new GraphQLList(Project),
    args: {
      teamId: {
        type: new GraphQLNonNull(GraphQLID),
        description: 'The unique team ID'
      }
    },
    async resolve(source, {teamId}, {authToken, socket, subbedChannelName}, refs) {
      const r = getRethink();
      requireSUOrTeamMember(authToken, teamId);
      const requestedFields = getRequestedFields(refs);
      // const removalFields = ['id', 'isArchived'];
      const changefeedHandler = makeChangefeedHandler(socket, subbedChannelName);
      r.table('Project')
      // use a compound index so we can easily paginate later
        .between([teamId, r.minval], [teamId, r.maxval], {index: 'teamIdCreatedAt'})
        .filter((project) => project('tags').contains('#archived'))
        .pluck(requestedFields)
        .changes({includeInitial: true})
        .run({cursor: true}, changefeedHandler);
    }
  }
};
