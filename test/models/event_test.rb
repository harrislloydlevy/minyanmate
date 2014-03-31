require 'test_helper'

class EventTest < ActiveSupport::TestCase
  setup do
    # Set the date to 1/1/2014 using delorean
    Delorean.time_travel_to Date.new(2014,1,1)
    ActionMailer::Base.deliveries = []
  end

  teardown do
    Delorean.back_to_the_present
  end


  test "success message" do
    # We setup a minyan with 9 people, now we add a 10th and make
    # sure a success message is sent.
    event = Event.find(events(:city_2))
    event.attend(yids(:Oilom))

    assert(
      1,
      ActionMailer::Base.deliveries
        .select { |m| m.subject.include? "Minyan for CBD" }
        .count
    )
  end

  # test "the truth" do
  #   assert true
  # end
  #
  test "send reminders all" do
    # Make sure the daily function sends out confirmation mails and
    # reminders as appropriate
    Event.send_event_reminders

    # Make sure we have a single confirmation for CBD Minyan
    assert_equal(
      1,
      ActionMailer::Base.deliveries
        .select { |m| m.subject.include? "Confirmation of CBD" }
        .count
    )

    # Make sure we have single reminder for the next days CBD Minyan
    assert_equal(
      1,
      ActionMailer::Base.deliveries
        .select { |m| m.subject.include? "Reminder of CBD" }
        .count
    )

    # Make sure we have no reminder for the erven shabbos minyan
    # as all regulars have RSVP'd
    assert_equal(
      0,
      ActionMailer::Base.deliveries
        .select { |m| m.subject.include? "Reminder of Erev" }
        .count
    )
  end

  test "send reminder to regulars" do
  end

  test "avoid reminders for rsvpd regulars" do
    # Get an event of 
    @event = events(:city_1)
    # Make sure regulars who have RSVPd don't get reminders
  end

  test "confirmation to regulars" do
    # Make sure regulars get reminders
  end

  test "confirmation to attendees" do
    # Make sure attendees who are not regulats get the confirmation mail
  end
end
