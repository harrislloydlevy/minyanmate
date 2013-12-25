json.array!(@yids) do |yid|
  json.extract! yid, :id, :name, :email, :phone
  json.url yid_url(yid, format: :json)
end
