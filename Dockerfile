# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot backend
FROM maven:3.8.5-openjdk-17 AS backend-builder
WORKDIR /app/backend
COPY backend/pom.xml ./
# Copy the built React assets into the backend's static resource directory
COPY --from=frontend-builder /app/frontend/build ./src/main/resources/static
COPY backend/src ./src
RUN cp src/main/resources/application.properties.example src/main/resources/application.properties
RUN mvn clean package -DskipTests

# Stage 3: Runtime
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend-builder /app/backend/target/*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar"]
