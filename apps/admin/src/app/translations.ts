export type Locale = "en" | "ru";

export type Translations = {
  console: string;
  users: string;
  staffOnly: string;
  usersTitle: string;
  usersIntro: string;
  signIn: string;
  signInCopy: string;
  registerAdmin: string;
  registerAdminCopy: string;
  requestInvitationTitle: string;
  requestInvitationCopy: string;
  requestInvitationSent: string;
  sendInvitationEmail: string;
  sendingInvitationEmail: string;
  inviteAdmin: string;
  inviteAdminCopy: string;
  invitationSent: string;
  invitationFailed: string;
  invitationTitle: string;
  invitationCopy: string;
  newPassword: string;
  confirmPassword: string;
  completeInvitation: string;
  completingInvitation: string;
  invitationComplete: string;
  returnToSignIn: string;
  passwordMismatch: string;
  email: string;
  password: string;
  signInButton: string;
  signingIn: string;
  signOut: string;
  search: string;
  allStatuses: string;
  active: string;
  blocked: string;
  deleted: string;
  loading: string;
  noUsers: string;
  name: string;
  account: string;
  roles: string;
  created: string;
  action: string;
  disable: string;
  enable: string;
  page: string;
  of: string;
  previous: string;
  next: string;
  emailVerified: string;
  emailUnverified: string;
  genericError: string;
  invalidLogin: string;
  notAdmin: string;
  forbidden: string;
  loadError: string;
  actionError: string;
  sessionChecking: string;
  refreshUnavailable: string;
};

export const translations = {
  en: {
    console: "Operations console",
    users: "Users & accounts",
    staffOnly: "Staff access only",
    usersTitle: "User management",
    usersIntro: "Search platform accounts and manage access. Role changes are not available in this console.",
    signIn: "Administrator sign in",
    signInCopy: "Use your authorized Slideforge administrator account.",
    registerAdmin: "Register with email",
    registerAdminCopy: "Enter the email address that an administrator invited. We will email your secure registration link.",
    requestInvitationTitle: "Register administrator account",
    requestInvitationCopy: "Enter the email address that was invited. If the invitation is valid, we will send a secure registration link.",
    requestInvitationSent: "If an active administrator invitation exists for this address, a registration link has been emailed.",
    sendInvitationEmail: "Email registration link",
    sendingInvitationEmail: "Sending email",
    inviteAdmin: "Invite administrator",
    inviteAdminCopy: "An invitation link will be sent so the new administrator can set their own password.",
    invitationSent: "Administrator invitation sent.",
    invitationFailed: "Could not send this invitation.",
    invitationTitle: "Complete administrator registration",
    invitationCopy: "Choose a password to activate your administrator account.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    completeInvitation: "Create administrator account",
    completingInvitation: "Creating account",
    invitationComplete: "Administrator account created. You can now sign in.",
    returnToSignIn: "Return to sign in",
    passwordMismatch: "Passwords do not match.",
    email: "Email address",
    password: "Password",
    signInButton: "Sign in",
    signingIn: "Signing in",
    signOut: "Sign out",
    search: "Search by name or email",
    allStatuses: "All statuses",
    active: "Active",
    blocked: "Disabled",
    deleted: "Deleted",
    loading: "Loading users",
    noUsers: "No users found",
    name: "Name",
    account: "Account",
    roles: "Roles",
    created: "Created",
    action: "Action",
    disable: "Disable",
    enable: "Enable",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
    emailVerified: "Verified",
    emailUnverified: "Unverified",
    genericError: "Something went wrong. Please try again.",
    invalidLogin: "Could not sign in. Check your email and password.",
    notAdmin: "This account does not have administrator access.",
    forbidden: "Administrator access is required.",
    loadError: "Could not load users. Please retry.",
    actionError: "Could not update this account.",
    sessionChecking: "Checking your session",
    refreshUnavailable: "Sign in to continue.",
  },
  ru: {
    console: "Консоль управления",
    users: "Пользователи и аккаунты",
    staffOnly: "Только для сотрудников",
    usersTitle: "Управление пользователями",
    usersIntro: "Поиск аккаунтов платформы и управление доступом. Изменение ролей в консоли недоступно.",
    signIn: "Вход администратора",
    signInCopy: "Используйте авторизованный аккаунт администратора Slideforge.",
    registerAdmin: "Регистрация по электронной почте",
    registerAdminCopy: "Введите адрес, приглашённый администратором. Мы отправим защищённую ссылку для регистрации.",
    requestInvitationTitle: "Регистрация учётной записи администратора",
    requestInvitationCopy: "Введите приглашённый адрес. Если приглашение действительно, мы отправим ссылку для регистрации.",
    requestInvitationSent: "Если для этого адреса есть активное приглашение, ссылка для регистрации отправлена.",
    sendInvitationEmail: "Отправить ссылку для регистрации",
    sendingInvitationEmail: "Отправка письма",
    inviteAdmin: "Пригласить администратора",
    inviteAdminCopy: "Ссылка для регистрации будет отправлена новому администратору, чтобы он сам задал пароль.",
    invitationSent: "Приглашение администратора отправлено.",
    invitationFailed: "Не удалось отправить приглашение.",
    invitationTitle: "Завершение регистрации администратора",
    invitationCopy: "Создайте пароль, чтобы активировать учётную запись администратора.",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите пароль",
    completeInvitation: "Создать учётную запись администратора",
    completingInvitation: "Создание учётной записи",
    invitationComplete: "Учётная запись администратора создана. Теперь можно войти.",
    returnToSignIn: "Вернуться ко входу",
    passwordMismatch: "Пароли не совпадают.",
    email: "Электронная почта",
    password: "Пароль",
    signInButton: "Войти",
    signingIn: "Выполняется вход",
    signOut: "Выйти",
    search: "Поиск по имени или почте",
    allStatuses: "Все статусы",
    active: "Активен",
    blocked: "Отключён",
    deleted: "Удалён",
    loading: "Загрузка пользователей",
    noUsers: "Пользователи не найдены",
    name: "Имя",
    account: "Аккаунт",
    roles: "Роли",
    created: "Создан",
    action: "Действие",
    disable: "Отключить",
    enable: "Включить",
    page: "Страница",
    of: "из",
    previous: "Назад",
    next: "Далее",
    emailVerified: "Подтверждена",
    emailUnverified: "Не подтверждена",
    genericError: "Что-то пошло не так. Попробуйте ещё раз.",
    invalidLogin: "Не удалось войти. Проверьте почту и пароль.",
    notAdmin: "У этой учётной записи нет доступа администратора.",
    forbidden: "Требуются права администратора.",
    loadError: "Не удалось загрузить пользователей. Повторите попытку.",
    actionError: "Не удалось изменить аккаунт.",
    sessionChecking: "Проверка сессии",
    refreshUnavailable: "Войдите, чтобы продолжить.",
  },
} satisfies Record<Locale, Translations>;
