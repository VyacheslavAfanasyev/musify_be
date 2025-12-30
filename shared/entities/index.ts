// Экспортируем только auth-user.entity, так как user.entity использует TypeORM
// и не нужен в сервисах, которые используют MongoDB
export * from "./auth-user.entity";
// user.entity экспортируется только там, где нужен TypeORM (Auth Service)
