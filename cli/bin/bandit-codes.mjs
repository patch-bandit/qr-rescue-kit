#!/usr/bin/env node
import { runCli } from "../lib/run.mjs";

const code = runCli(process.argv.slice(2));
process.exitCode = code;
