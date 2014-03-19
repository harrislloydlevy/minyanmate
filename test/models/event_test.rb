require 'test_helper'

class EventTest < ActiveSupport::TestCase
  # test "the truth" do
  #   assert true
  # end
  #
  test "send reminders all" do
    # Make sure the daily function sends out confirmation mails and
    # reminders as appropriate
    Event.send_event_reminders

    ap ActionMailer::Base.deliveries
  end

  test "avoid reminders for regulars" do
    # Make sure regulars who have RSVPd don't get reminders
  end

  test "confirmation to regulars" do
    # Make sure regulars get reminders
  end

  test "confirmation to attendees" do
    # Make sure attendees who are not regulats get the confirmation mail
  end
end
