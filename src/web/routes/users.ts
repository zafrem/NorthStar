import { FastifyInstance } from 'fastify';
import { getAllUsers, getUserById, updateUser } from '../../models/user.js';
import { getOrganizationById, getAllOrganizations } from '../../models/organization.js';
import { getGoalsByOwnerId } from '../../models/goal.js';

export async function usersRoutes(server: FastifyInstance): Promise<void> {
  server.get('/users', async (request, reply) => {
    const users = getAllUsers();
    const organizations = getAllOrganizations();

    // Create a map of org IDs to org names for display
    const orgMap = new Map(organizations.map((org) => [org.id, org.name]));

    return reply.view('users/index.ejs', {
      title: 'Users - NorthStar',
      user: request.user,
      users,
      orgMap,
    });
  });

  server.get<{
    Params: { id: string };
  }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const targetUser = getUserById(id);

    if (!targetUser) {
      return reply.status(404).view('layouts/error.ejs', {
        title: 'Not Found - NorthStar',
        user: request.user,
        message: 'User not found',
      });
    }

    const organization = getOrganizationById(targetUser.orgId);
    const goals = getGoalsByOwnerId(id);

    return reply.view('users/view.ejs', {
      title: `${targetUser.name} - NorthStar`,
      user: request.user,
      targetUser,
      organization,
      goals,
    });
  });

  server.get<{
    Params: { id: string };
  }>('/users/:id/edit', async (request, reply) => {
    const { id } = request.params;
    const targetUser = getUserById(id);

    if (!targetUser) {
      return reply.status(404).view('layouts/error.ejs', {
        title: 'Not Found - NorthStar',
        user: request.user,
        message: 'User not found',
      });
    }

    const organizations = getAllOrganizations();

    return reply.view('users/edit.ejs', {
      title: `Edit ${targetUser.name} - NorthStar`,
      user: request.user,
      targetUser,
      organizations,
    });
  });

  server.post<{
    Params: { id: string };
    Body: {
      name?: string;
      email?: string;
      jobFunction?: string;
    };
  }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, email, jobFunction } = request.body;

    const targetUser = getUserById(id);
    if (!targetUser) {
      return reply.status(404).view('layouts/error.ejs', {
        title: 'Not Found - NorthStar',
        user: request.user,
        message: 'User not found',
      });
    }

    updateUser(id, {
      name: name?.trim() || undefined,
      email: email?.trim() || undefined,
      jobFunction: jobFunction?.trim() || undefined,
    });

    return reply.redirect(`/users/${id}?success=User updated`);
  });
}
