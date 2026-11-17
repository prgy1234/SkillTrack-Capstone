const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
async function request(method, url, body) {
  const options = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

const response = await fetch(`${API_BASE_URL}${url}`, options);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // response body wasn't JSON
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Auth
export function signup(data) {
  return request('POST', '/api/v1/auth/signup', data);
}

export function login(email, password) {
  return request('POST', '/api/v1/auth/login', { email, password });
}

export function logout() {
  return request('POST', '/api/v1/auth/logout');
}

export function changePassword(currentPassword, newPassword) {
  return request('POST', '/api/v1/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

export function getMe() {
  return request('GET', '/api/v1/auth/me');
}

// Activities
export function getActivities() {
  return request('GET', '/api/v1/activities');
}

export function createActivity(data) {
  return request('POST', '/api/v1/activities', data);
}

export function updateActivity(id, data) {
  return request('PUT', `/api/v1/activities/${id}`, data);
}

// Learners
export function getLearners() {
  return request('GET', '/api/v1/learners');
}

export function createLearner(data) {
  return request('POST', '/api/v1/learners', data);
}

export function deleteLearner(learnerId) {
  return request('DELETE', `/api/v1/learners/${learnerId}`);
}

export function resetPassword(learnerId) {
  return request('POST', `/api/v1/learners/${learnerId}/reset-password`);
}

// Assignments
export function getLearnerAssignments(learnerId) {
  return request('GET', `/api/v1/learners/${learnerId}/assignments`);
}

export function createAssignment(learnerId, activityId) {
  return request('POST', '/api/v1/assignments', {
    learnerId: Number(learnerId),
    activityId: Number(activityId),
  });
}

export function updateAssignmentStatus(assignmentId, status) {
  return request('PATCH', `/api/v1/assignments/${assignmentId}/status`, { status });
}

// Cohort
export function getCohortSummary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.learnerId) params.set('learnerId', filters.learnerId);
  if (filters.activityId) params.set('activityId', filters.activityId);
  const query = params.toString();
  return request('GET', `/api/v1/cohort-summary${query ? `?${query}` : ''}`);
}

// Candidate self-service
export function getMyAssignments() {
  return request('GET', '/api/v1/me/assignments');
}
