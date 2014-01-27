module ApplicationHelper
  def btn(path, icon, label="")
    render partial: "button", locals: { path: path, icon: icon, label: label }
  end
end
