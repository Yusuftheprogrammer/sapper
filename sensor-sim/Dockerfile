FROM rust:1-bookworm AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/sensor-sim /usr/local/bin/sensor-sim
ENTRYPOINT ["sensor-sim"]
CMD ["1000"]