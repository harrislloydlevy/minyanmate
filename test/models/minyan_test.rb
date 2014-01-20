require 'test_helper'

class MinyanTest < ActiveSupport::TestCase
  test "the truth" do
    assert true
  end

  test "next minyan" do
    minyan = minyans(:city)

    # City Minyan runs mon-thursday
    from_date = Date.new(2013,12,1) # A sunday
    assert minyan.next_minyan(from_date) == Date.new(2013,12,2) # Should be on Monday

    from_date = Date.new(2013,12,2) # A monday
    assert minyan.next_minyan(from_date) == Date.new(2013,12,2) # Should be that day
  end

  test "upcoming minyans" do
    minyan = minyans(:city)
 
    upcoming = minyan.upcoming(10, Date.new(2014,1,1))

    # First make sure there are 10.
    assert upcoming.count == 10

    # Now make sure that the events are returning the right dates
    # City Minyan runs Monday - Thursday
    assert upcoming[0].date == Date.new(2014,1,1)
    assert upcoming[1].date == Date.new(2014,1,2)
    assert upcoming[2].date == Date.new(2014,1,6)
    assert upcoming[3].date == Date.new(2014,1,7)
    assert upcoming[4].date == Date.new(2014,1,8)
    assert upcoming[5].date == Date.new(2014,1,9)
    assert upcoming[6].date == Date.new(2014,1,13)
    assert upcoming[7].date == Date.new(2014,1,14)
    assert upcoming[8].date == Date.new(2014,1,15)
    assert upcoming[9].date == Date.new(2014,1,16)

   # Test we can get smaller lists
   assert minyan.upcoming(5).count == 5
  end
  
  test "attending" do
    minyan = minyans(:city)
    yid = yids(:one)

    # RSVP for the next 10 upcoming minyans
    minyan.upcoming(10).each do |event|
      event.attend(yid)
    end

    # Assert that we have a record of attendance by this yid for each of the next
    # 10 events.
    minyan.upcoming(10).each do |event|
      assert event.in_attendance(yid)
      assert_not_nil event.rsvps.find_by(yid: yid)
    end

    # Now make sure double attending doesn't make a difference
    assert_no_difference('Rsvp.count') do
      minyan.events[0].attend(yid)
    end
  end
end 
