# Backend image (ADR 0016). Build context is the repo root, because the build generates code from
# contracts/openapi.yaml:  docker build -f backend/Dockerfile -t autojournal-backend .

FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace/backend
COPY backend/.mvn .mvn
COPY backend/mvnw backend/pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY contracts/openapi.yaml /workspace/contracts/openapi.yaml
COPY backend/src src
# Tests, Modulith verification and ktlint already ran in CI before the image is built.
RUN ./mvnw -B -q -DskipTests package \
    && java -Djarmode=tools -jar target/autojournal-*.jar extract --layers --launcher --destination /workspace/extracted

FROM eclipse-temurin:17-jre
LABEL org.opencontainers.image.source="https://github.com/jovanhn/auto-journal"
RUN useradd --system --uid 10001 app
WORKDIR /app
# One layer per Spring Boot layer, so a code-only change re-pushes only the small application layer.
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
USER app
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
