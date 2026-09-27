import type { RouteRecordRaw } from 'vue-router'
import LoginView from '../views/auth/LoginView.vue'
import WelcomeView from '../views/auth/WelcomeView.vue'
import ChangePasswordView from '../views/auth/ChangePasswordView.vue'
import StudentDashboardView from '../views/dashboards/StudentDashboardView.vue'
import StaffDashboardView from '../views/dashboards/StaffDashboardView.vue'
import UsersView from '../views/admin/UsersView.vue'
import AuditLogView from '../views/admin/AuditLogView.vue'
import AddStudentView from '../views/admin/students/AddStudentView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import EventsListView from '../views/app/events/EventsListView.vue'
import EventFormView from '../views/app/events/EventFormView.vue'
import EventDetailView from '../views/app/events/EventDetailView.vue'
import ApprovalQueueView from '../views/app/approvals/ApprovalQueueView.vue'
import AttendanceCaptureView from '../views/app/attendance/AttendanceCaptureView.vue'
import MyAttendanceView from '../views/app/attendance/MyAttendanceView.vue'
import ReportsDashboardView from '../views/app/reports/ReportsDashboardView.vue'
import EventReportView from '../views/app/reports/EventReportView.vue'
import { publicRoutes } from './public.routes'
import { EVENT_READ_ROLES, SUBMIT_EVENT_ROLES } from '../api/events.api'
import { ATTENDANCE_SUPERVISOR_ROLES } from '../api/attendance.api'
import { REPORT_ROLES } from '../api/reports.api'

const STAFF_ROLES = ['Department Head', 'Event Coordinator', 'Instructor', 'Student Officer', 'Admin']

export const routes: RouteRecordRaw[] = [
  ...publicRoutes,
  {
    path: '/welcome',
    name: 'welcome',
    component: WelcomeView,
    meta: { public: true },
    beforeEnter: () => {
      if (window.matchMedia?.('(min-width: 768px)').matches) {
        return { name: 'login' }
      }
      return true
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/sign-in',
    name: 'sign-in',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'home',
        redirect: { name: 'welcome' },
        meta: { public: true },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: StaffDashboardView,
        meta: { roles: STAFF_ROLES },
      },
      {
        path: 'student-dashboard',
        name: 'student-dashboard',
        component: StudentDashboardView,
        meta: { roles: ['Student', 'Student Officer', 'Admin'] },
      },
      {
        path: 'change-password',
        name: 'change-password',
        component: ChangePasswordView,
        meta: {},
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: UsersView,
        meta: { roles: ['Admin'] },
      },
      {
        path: 'admin/students/new',
        name: 'admin-student-new',
        component: AddStudentView,
        meta: { roles: ['Admin'] },
      },
      {
        path: 'admin/audit',
        name: 'admin-audit',
        component: AuditLogView,
        meta: { roles: ['Admin'] },
      },
      {
        path: 'manage/events',
        name: 'events-list',
        component: EventsListView,
        meta: { roles: [...EVENT_READ_ROLES] },
      },
      {
        path: 'manage/events/:id/edit',
        name: 'event-edit',
        component: EventFormView,
        meta: { roles: [...SUBMIT_EVENT_ROLES] },
      },
      {
        path: 'manage/events/:id',
        name: 'event-detail',
        component: EventDetailView,
        meta: { roles: [...EVENT_READ_ROLES] },
      },
      {
        path: 'approvals',
        name: 'approvals-queue',
        component: ApprovalQueueView,
        meta: { roles: [...SUBMIT_EVENT_ROLES] },
      },
      {
        path: 'manage/events/:id/attendance',
        name: 'attendance-capture',
        component: AttendanceCaptureView,
        meta: { roles: [...ATTENDANCE_SUPERVISOR_ROLES] },
      },
      {
        path: 'my-attendance',
        name: 'my-attendance',
        component: MyAttendanceView,
        meta: {},
      },
      {
        path: 'reports',
        name: 'reports-dashboard',
        component: ReportsDashboardView,
        meta: { roles: [...REPORT_ROLES] },
      },
      {
        path: 'reports/events/:id',
        name: 'event-report',
        component: EventReportView,
        meta: { roles: [...REPORT_ROLES] },
      },
    ],
  },
]
