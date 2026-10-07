#!/usr/bin/env ruby
# Generator script for CFE parity fixtures.
# Run from the laa-check-client-qualifies repo at commit 1a30ea3f.
#
# Usage from CCQ repo:
#   bin/rails runner path/to/generate-ccq-fixtures.rb ~/dev/laa-cla-operator-app/src/eligibility/domain/cfe/fixtures
#
# This reads each *.answers.json file in the specified directory, computes
# the CFE payload for each using CCQ's builders, and writes the results as
# *.json files alongside them (same stem, no .answers suffix).

require "json"
require "date"

fixtures_dir = ARGV[0] || raise("Usage: bin/rails runner generate-ccq-fixtures.rb <fixtures-dir>")
Dir.exist?(fixtures_dir) || raise("Directory not found: #{fixtures_dir}")

Dir.glob("#{fixtures_dir}/*.answers.json").each do |answers_file|
  puts "Processing #{File.basename(answers_file)}..."

  session_data = JSON.parse(File.read(answers_file))

  # Compute relevant steps (same as TS stepsFor)
  relevant_steps = Steps::Helper.relevant_steps(session_data)

  # Build the payload by calling each service (same order as CfeService.call)
  payload = {}

  Cfe::AssessmentPayloadService.call(session_data, payload, relevant_steps)
  Cfe::DependantsPayloadService.call(session_data, payload, relevant_steps)
  Cfe::ProceedingsPayloadService.call(session_data, payload, relevant_steps)
  Cfe::EmploymentIncomePayloadService.call(session_data, payload, relevant_steps)
  Cfe::IrregularIncomePayloadService.call(session_data, payload, relevant_steps)
  Cfe::VehiclePayloadService.call(session_data, payload, relevant_steps)
  Cfe::AssetsPayloadService.call(session_data, payload, relevant_steps)
  Cfe::RegularTransactionsPayloadService.call(session_data, payload, relevant_steps)
  Cfe::ApplicantPayloadService.call(session_data, payload, relevant_steps)
  Cfe::PartnerPayloadService.call(session_data, payload, relevant_steps)

  # Remove nil values (matching TS's assignIfDefined behavior)
  payload.compact!
  payload.each_value { |v| v.compact! if v.is_a?(Hash) }

  # Write the output fixture
  output_file = answers_file.sub(/\.answers\.json$/, ".json")
  output = {
    input: session_data,
    relevant_steps: relevant_steps.map(&:to_s),
    payload: payload
  }
  File.write(output_file, JSON.pretty_generate(output))
  puts "  → #{File.basename(output_file)}"
end

puts "Done!"


