# Portable Java 21 container. Unit/integration test approval happens in CI before deployment.
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./pom.xml
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
ENV PORT=8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+ExitOnOutOfMemoryError"
COPY --from=build /workspace/target/seven-chat-api-0.1.0-SNAPSHOT.jar /app/server.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/server.jar"]
