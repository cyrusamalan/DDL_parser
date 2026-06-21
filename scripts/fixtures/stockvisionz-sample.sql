CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE SCHEMA IF NOT EXISTS account;

CREATE TYPE public.timeframe_enum AS ENUM ('1h', '4h', '1D', '1W', '1M');
CREATE TYPE public.strategy_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

CREATE TABLE account.role (
    role_id     UUID DEFAULT gen_random_uuid(),
    role_name   VARCHAR(50) NOT NULL,
    CONSTRAINT pk_account_role PRIMARY KEY (role_id)
);

CREATE TABLE account.user (
    user_id       UUID DEFAULT gen_random_uuid(),
    username      VARCHAR(50) NOT NULL,
    CONSTRAINT pk_account_user PRIMARY KEY (user_id)
);

CREATE TABLE stocks.instrument (
    instrument_id SERIAL,
    ticker        VARCHAR(20) NOT NULL,
    CONSTRAINT pk_stocks_instrument PRIMARY KEY (instrument_id)
);

CREATE TABLE account.user_role (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    CONSTRAINT pk_account_user_role PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES account.user(user_id)
);

CREATE TABLE models.strategy (
    strategy_id UUID DEFAULT gen_random_uuid(),
    status      public.strategy_status_enum,
    CONSTRAINT pk_models_strategy PRIMARY KEY (strategy_id)
);

CREATE TABLE stocks.ohlcv_bar (
    instrument_id INTEGER NOT NULL,
    bar_time      TIMESTAMPTZ NOT NULL,
    timeframe     public.timeframe_enum NOT NULL,
    open          NUMERIC NOT NULL,
    CONSTRAINT pk_stocks_ohlcv_bar PRIMARY KEY (instrument_id, bar_time, timeframe),
    CONSTRAINT fk_ohlcv_instrument FOREIGN KEY (instrument_id) REFERENCES stocks.instrument(instrument_id)
);

SELECT create_hypertable('stocks.ohlcv_bar', 'bar_time');

CREATE TABLE account.order (
    order_id      UUID DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL,
    instrument_id INTEGER NOT NULL,
    CONSTRAINT pk_account_order PRIMARY KEY (order_id),
    CONSTRAINT fk_order_portfolio FOREIGN KEY (portfolio_id) REFERENCES account.portfolio(portfolio_id)
);

CREATE TABLE models.signal (
    signal_id   UUID DEFAULT gen_random_uuid(),
    signal_time TIMESTAMPTZ NOT NULL,
    strategy_id UUID NOT NULL,
    CONSTRAINT pk_models_signal PRIMARY KEY (signal_id, signal_time),
    CONSTRAINT fk_signal_strategy FOREIGN KEY (strategy_id) REFERENCES models.strategy(strategy_id)
);

SELECT create_hypertable('models.signal', 'signal_time');
