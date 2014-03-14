desc "Task called by the heroku scheduler"
task :send_reminders => :environment do
  puts "Sending reminder emails"
  Event.send_reminders
  puts "Finished sending reminders"
end
